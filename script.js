// ===== API Configuration =====
// Replace with your Unsplash API key from unsplash.com
const API_KEY = 'L4ZPqUL4YrCuLxtMMDAQYUW6O-p6xFRv-gIpkbkIPQ8';
const API_BASE = 'https://api.unsplash.com';

// ===== State Management =====
let currentPage = 1;
let currentQuery = 'nature';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let viewedCount = parseInt(localStorage.getItem('viewedCount')) || 0;
let downloadCount = parseInt(localStorage.getItem('downloadCount')) || 0;
let totalImages = [];

// ===== DOM Elements =====
const gallery = document.getElementById('gallery');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalClose = document.querySelector('.modal-close');
const tagBtns = document.querySelectorAll('.tag-btn');
const toast = document.getElementById('toast');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const favoritesList = document.getElementById('favoritesList');
const favoritesCount = document.getElementById('favoritesCount');
const totalViewed = document.getElementById('totalViewed');
const totalDownloads = document.getElementById('totalDownloads');

// ===== Background Animation =====
function initBackground() {
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.2,
            dy: (Math.random() - 0.5) * 0.2,
            alpha: Math.random() * 0.3 + 0.05
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
            ctx.fill();
            
            p.x += p.dx;
            p.y += p.dy;
            
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        });
        
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(0, 200, 255, ${0.05 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ===== API Functions =====
async function fetchImages(query = 'nature', page = 1) {
    try {
        gallery.innerHTML = `
            <div class="empty-state-full">
                <div class="loading-animation">
                    <div class="blob blob-1"></div>
                    <div class="blob blob-2"></div>
                    <div class="blob blob-3"></div>
                </div>
                <p>Loading amazing images...</p>
            </div>
        `;
        
        const response = await fetch(
            `${API_BASE}/search/photos?query=${query}&page=${page}&per_page=20&client_id=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('API Error - Please check your API key');
        }
        
        const data = await response.json();
        
        if (page === 1) {
            totalImages = data.results;
            gallery.innerHTML = '';
        } else {
            totalImages = [...totalImages, ...data.results];
        }
        
        renderGallery(totalImages);
        
        if (data.results.length < 20) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Error fetching images:', error);
        showToast('Error: ' + error.message);
        gallery.innerHTML = `
            <div class="empty-state-full" style="grid-column: 1/-1;">
                <p style="color: #ff4444;">⚠️ ${error.message}</p>
                <p style="color: #888; font-size: 12px;">Make sure your Unsplash API key is correct</p>
            </div>
        `;
    }
}

function renderGallery(images) {
    gallery.innerHTML = images.map(img => `
        <div class="gallery-item" data-id="${img.id}" data-image='${JSON.stringify({
            id: img.id,
            url: img.urls.regular,
            thumb: img.urls.small,
            title: img.alt_description || 'Untitled',
            photographer: img.user.name,
            width: img.width,
            height: img.height,
            downloads: img.downloads || 0,
            likes: img.likes || 0,
            description: img.description || 'No description available',
            profileUrl: img.user.portfolio_url || img.user.social?.portfolio_url || '#',
            tags: img.tags?.map(t => t.title).slice(0, 5) || []
        })}'>
            <img src="${img.urls.small}" alt="${img.alt_description || 'Image'}" loading="lazy">
            <div class="gallery-item-overlay">
                <div class="gallery-item-title">${img.user.name}</div>
                <div class="gallery-item-actions">
                    <button class="gallery-item-btn preview-btn">👁️ Preview</button>
                    <button class="gallery-item-btn favorite-btn">❤️ Save</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Attach event listeners
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.querySelector('.preview-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(item);
        });
        
        item.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const imgData = JSON.parse(item.dataset.image);
            toggleFavorite(imgData);
        });
        
        item.addEventListener('click', () => openModal(item));
    });
}

// ===== Modal Functions =====
function openModal(element) {
    const imgData = JSON.parse(element.dataset.image);
    
    modalImage.src = imgData.url;
    document.getElementById('modalTitle').textContent = imgData.title;
    document.getElementById('modalDescription').textContent = imgData.description;
    document.getElementById('modalPhotographer').textContent = imgData.photographer;
    document.getElementById('modalDimensions').textContent = `${imgData.width} × ${imgData.height}`;
    document.getElementById('modalDownloads').textContent = (imgData.downloads || 0).toLocaleString();
    document.getElementById('modalLikes').textContent = (imgData.likes || 0).toLocaleString();
    
    document.getElementById('modalTags').innerHTML = imgData.tags
        .map(tag => `<span class="tag">${tag}</span>`)
        .join('');
    
    const profileLink = document.getElementById('modalViewProfile');
    profileLink.href = imgData.profileUrl || `https://unsplash.com/@${imgData.photographer}`;
    
    document.getElementById('modalDownloadBtn').onclick = () => downloadImage(imgData);
    document.getElementById('modalFavoriteBtn').onclick = () => toggleFavorite(imgData);
    
    modal.style.display = 'flex';
    viewedCount++;
    localStorage.setItem('viewedCount', viewedCount);
    updateStats();
    
    showToast('✨ Image loaded in preview');
}

function closeModal() {
    modal.style.display = 'none';
}

// ===== Download Function =====
async function downloadImage(imgData) {
    try {
        const link = document.createElement('a');
        link.href = imgData.url + '?w=1600';
        link.download = `ai-studio-${imgData.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        downloadCount++;
        localStorage.setItem('downloadCount', downloadCount);
        updateStats();
        
        showToast('✅ Image downloaded successfully');
    } catch (error) {
        showToast('❌ Download failed');
    }
}

// ===== Favorites Management =====
function toggleFavorite(imgData) {
    const exists = favorites.some(fav => fav.id === imgData.id);
    
    if (exists) {
        favorites = favorites.filter(fav => fav.id !== imgData.id);
        showToast('💔 Removed from favorites');
    } else {
        favorites.push(imgData);
        showToast('❤️ Added to favorites');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavorites();
    updateStats();
}

function updateFavorites() {
    favoritesCount.textContent = favorites.length;
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-state">Save images to your collection</p>';
        return;
    }
    
    favoritesList.innerHTML = favorites.map(fav => `
        <div class="favorite-thumb" onclick="openFavoriteModal('${fav.id}')">
            <img src="${fav.thumb}" alt="${fav.title}">
        </div>
    `).join('');
}

function openFavoriteModal(imgId) {
    const imgData = favorites.find(f => f.id === imgId);
    if (imgData) {
        // Create a fake element to use with openModal
        const fakeElement = document.createElement('div');
        fakeElement.dataset.image = JSON.stringify(imgData);
        openModal(fakeElement);
    }
}

// ===== Statistics =====
function updateStats() {
    totalViewed.textContent = viewedCount;
    totalDownloads.textContent = downloadCount;
}

// ===== Search & Filter =====
function handleSearch() {
    const query = searchInput.value.trim() || 'nature';
    currentQuery = query;
    currentPage = 1;
    pageTitle.textContent = `"${query}"`;
    pageSubtitle.textContent = `Showing results for: ${query}`;
    fetchImages(query, 1);
}

// ===== Toast Notifications =====
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ===== Event Listeners =====
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    fetchImages(currentQuery, currentPage);
    document.querySelector('.gallery-wrapper').scrollTop += 300;
});

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Tag buttons
tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        searchInput.value = tag;
        handleSearch();
    });
});

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initBackground();
    updateFavorites();
    updateStats();
    
    if (API_KEY === 'YOUR_UNSPLASH_API_KEY_HERE') {
        gallery.innerHTML = `
            <div class="empty-state-full" style="grid-column: 1/-1;">
                <p style="color: #ff9f0a; font-size: 16px;">⚙️ Setup Required</p>
                <p style="color: #888; font-size: 13px;">Replace 'YOUR_UNSPLASH_API_KEY_HERE' in script.js with your Unsplash API key</p>
                <p style="color: #666; font-size: 11px;">Get your free key at: unsplash.com/developers</p>
            </div>
        `;
    } else {
        fetchImages('nature', 1);
    }
});