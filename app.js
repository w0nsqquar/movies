let currentScreen = 'main';
let allMovies = [];
let currentMovieId = null;
let currentUser = null;
let userReviews = {};
let favorites = [];
let currentPage = 1;
const itemsPerPage = 20;
let filteredMovies = [];

const API_URL = 'https://w0nsqquar.github.io/filmoteka/api'; 

// ========== РОУТЕР ==========
function navigate(screen, movieId = null) {
    let hash = screen;
    if (screen === 'movieDetail' && movieId) {
        hash = `movie/${movieId}`;
    }
    window.location.hash = hash;
    showScreen(screen, movieId);
}

function handleRoute() {
    const hash = window.location.hash.replace('#', '');
    
    if (!hash || hash === 'main') {
        showScreen('main');
    } else if (hash === 'movies') {
        showScreen('movies');
    } else if (hash === 'favorites') {
        showScreen('favorites');
    } else if (hash === 'profile') {
        showScreen('profile');
    } else if (hash === 'login') {
        showScreen('login');
    } else if (hash === 'register') {
        showScreen('register');
    } else if (hash.startsWith('movie/')) {
        const id = parseInt(hash.split('/')[1]);
        if (!isNaN(id)) {
            showMovieDetail(id);
        } else {
            showScreen('main');
        }
    } else {
        showScreen('main');
    }
}

// ========== СОХРАНЕНИЕ ДАННЫХ В localStorage ==========
function saveUserData() {
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('favorites', JSON.stringify(favorites));
        localStorage.setItem('userReviews', JSON.stringify(userReviews));
    } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('favorites');
        localStorage.removeItem('userReviews');
    }
}

function loadUserData() {
    const savedUser = localStorage.getItem('currentUser');
    const savedFavorites = localStorage.getItem('favorites');
    const savedReviews = localStorage.getItem('userReviews');
    
    if (savedUser) currentUser = JSON.parse(savedUser);
    if (savedFavorites) favorites = JSON.parse(savedFavorites);
    if (savedReviews) userReviews = JSON.parse(savedReviews);
    updateAuthUI();
}

// ========== ЗАГРУЗКА ДАННЫХ ИЗ API ==========
async function loadAllData() {
    try {
        const response = await fetch(API_URL + '/movies/');
        allMovies = await response.json();
        allMovies.sort((a, b) => b.year - a.year);
        
        renderScrollMovies('new2026Grid', allMovies.filter(m => m.year === 2026).slice(0, 15));
        renderScrollMovies('topGrid', [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 15));
        renderRecommendationsOnMain();
        applyFilters();
        
        setTimeout(() => { initScrollButtons(); initWheelScroll(); }, 100);
    } catch (e) {
        console.error('Ошибка загрузки фильмов:', e);
    }
}

function renderScrollMovies(containerId, movieList) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!movieList?.length) {
        container.innerHTML = '<div class="movie-card">Скоро</div>';
        return;
    }
    let html = '';
    for (const m of movieList) {
        html += `<div class="movie-card">
            <div class="movie-poster" onclick="navigate('movieDetail', ${m.id})">
                <img src="${m.poster}" class="poster-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'450\' viewBox=\'0 0 300 450\'%3E%3Crect width=\'300\' height=\'450\' fill=\'%23434B4D\'/%3E%3Ctext x=\'150\' y=\'225\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-size=\'40\' fill=\'white\'%3E🎬%3C/text%3E%3C/svg%3E\'">
            </div>
            <div class="movie-info">
                <div class="movie-title">${escapeHtml(m.title)}</div>
                <div class="movie-year">${m.year} • ${m.age_rating}</div>
                <div class="stars">${renderStars(m.rating)}</div>
                <div class="card-buttons">
                    <button class="icon-btn" onclick="event.stopPropagation(); toggleFavorite(${m.id})">${isFavorite(m.id) ? '❤️' : '🤍'}</button>
                </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderMoviesList(movieList, containerId = 'moviesGrid', isClickable = true) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!movieList?.length) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">Ничего не найдено.</p>';
        return;
    }
    let html = '';
    for (const m of movieList) {
        const clickAttr = isClickable ? `onclick="navigate('movieDetail', ${m.id})"` : '';
        html += `<div class="movie-card">
            <div class="movie-poster" ${clickAttr}>
                <img src="${m.poster}" class="poster-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'450\' viewBox=\'0 0 300 450\'%3E%3Crect width=\'300\' height=\'450\' fill=\'%23434B4D\'/%3E%3Ctext x=\'150\' y=\'225\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-size=\'40\' fill=\'white\'%3E🎬%3C/text%3E%3C/svg%3E\'">
            </div>
            <div class="movie-info">
                <div class="movie-title">${escapeHtml(m.title)}</div>
                <div class="movie-year">${m.year} • ${m.age_rating}</div>
                <div class="stars">${renderStars(m.rating)}</div>
                <div class="card-buttons">
                    <button class="icon-btn" onclick="event.stopPropagation(); toggleFavorite(${m.id})">${isFavorite(m.id) ? '❤️' : '🤍'}</button>
                </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderStars(rating) {
    const starsCount = Math.round(rating / 2);
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < starsCount ? '★' : '☆';
    return `<span class="stars">${stars}</span> <span class="rating-number">${rating.toFixed(1)}/10</span>`;
}

function isFavorite(movieId) { return favorites.indexOf(movieId) !== -1; }

function toggleFavorite(movieId) {
    if (!currentUser) { 
        alert('Войдите в аккаунт'); 
        navigate('login'); 
        return; 
    }
    
    const index = favorites.indexOf(movieId);
    if (index !== -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(movieId);
    }
    saveUserData();
    
    const detailBtn = document.querySelector('#movieDetail .btn-outline, #movieDetail .btn-primary');
    if (detailBtn) {
        const isFav = favorites.indexOf(movieId) !== -1;
        detailBtn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        detailBtn.className = 'btn ' + (isFav ? 'btn-primary' : 'btn-outline');
    }
    
    document.querySelectorAll('.icon-btn').forEach(btn => {
        const match = btn.getAttribute('onclick')?.match(/toggleFavorite\((\d+)\)/);
        if (match) {
            const id = parseInt(match[1]);
            const isNowFav = favorites.indexOf(id) !== -1;
            btn.textContent = isNowFav ? '❤️' : '🤍';
            if (isNowFav) btn.classList.add('favorite');
            else btn.classList.remove('favorite');
        }
    });
    
    if (document.getElementById('favoritesScreen').style.display === 'block') {
        renderFavorites();
    }
}

function renderFavorites() {
    const favMovies = allMovies.filter(m => favorites.indexOf(m.id) !== -1);
    renderMoviesList(favMovies, 'favoritesGrid', true);
}

function renderRecommendationsOnMain() {
    const grid = document.getElementById('recommendationsGrid');
    if (!currentUser) {
        grid.innerHTML = '<div class="recommendation-placeholder"><div class="recommendation-message">Войдите в аккаунт</div><button class="btn-small" onclick="navigate(\'login\')">Войти</button></div>';
        return;
    }
    if (!currentUser.genres) {
        grid.innerHTML = '<div class="recommendation-placeholder"><div class="recommendation-message">Укажите любимые жанры в профиле</div><button class="btn-small" onclick="navigate(\'profile\')">Редактировать</button></div>';
        return;
    }
    const userGenres = currentUser.genres.toLowerCase().split(/[ ,]+/);
    const recommended = allMovies.filter(m => userGenres.some(g => m.genre.toLowerCase().includes(g)));
    recommended.sort((a, b) => b.rating - a.rating);
    renderScrollMovies('recommendationsGrid', recommended.slice(0, 12));
}

function searchMovies() {
    const query = document.getElementById('searchQuery').value.toLowerCase().trim();
    let filtered = [...allMovies];
    if (query) {
        filtered = filtered.filter(m => m.title.toLowerCase().includes(query) ||
            m.genre.toLowerCase().includes(query) ||
            m.year.toString().includes(query) ||
            (m.director && m.director.toLowerCase().includes(query)));
    }
    const genre = document.getElementById('filterGenre')?.value || 'all';
    const year = document.getElementById('filterYear')?.value || 'all';
    const age = document.getElementById('filterAge')?.value || 'all';
    const country = document.getElementById('filterCountry')?.value || 'all';
    const sort = document.getElementById('sortBy')?.value || 'rating';
    
    if (genre !== 'all') filtered = filtered.filter(m => m.genre === genre);
    if (age !== 'all') filtered = filtered.filter(m => m.age_rating === age);
    if (country !== 'all') filtered = filtered.filter(m => m.country === country);
    
    if (year !== 'all') {
        if (year === '2010-2020') filtered = filtered.filter(m => m.year >= 2010 && m.year <= 2020);
        else if (year === '2000-2010') filtered = filtered.filter(m => m.year >= 2000 && m.year <= 2010);
        else filtered = filtered.filter(m => m.year.toString() === year);
    }
    
    if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    else if (sort === 'rating_asc') filtered.sort((a, b) => a.rating - b.rating);
    else if (sort === 'year') filtered.sort((a, b) => b.year - a.year);
    else if (sort === 'year_asc') filtered.sort((a, b) => a.year - b.year);
    else if (sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));
    
    filteredMovies = filtered;
    currentPage = 1;
    renderPaginatedMovies();
}

function applyFilters() { searchMovies(); }

function renderPaginatedMovies() {
    const start = (currentPage - 1) * itemsPerPage;
    const pageMovies = filteredMovies.slice(start, start + itemsPerPage);
    renderMoviesList(pageMovies, 'moviesGrid', true);
    
    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    if (pagination && totalPages > 1) {
        let html = '';
        for (let i = 1; i <= Math.min(totalPages, 10); i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        pagination.innerHTML = html;
    } else if (pagination) {
        pagination.innerHTML = '';
    }
}

function goToPage(page) { currentPage = page; renderPaginatedMovies(); }

function resetFilters() {
    const selects = ['filterGenre', 'filterYear', 'filterAge', 'filterCountry', 'sortBy'];
    selects.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = 'all'; });
    if (document.getElementById('searchQuery')) document.getElementById('searchQuery').value = '';
    filteredMovies = [...allMovies];
    currentPage = 1;
    renderPaginatedMovies();
}

function showMovieDetail(id) {
    currentMovieId = id;
    localStorage.setItem('currentMovieId', id);
    const movie = allMovies.find(m => m.id === id);
    if (!movie) return;
    
    let actorsHtml = '';
    if (movie.actors?.length) {
        actorsHtml = '<h4 class="actors-title">⭐ В ролях</h4><ul class="actors-list">';
        for (const a of movie.actors) actorsHtml += `<li>${escapeHtml(a)}</li>`;
        actorsHtml += '</ul>';
    }
    
    const isFav = isFavorite(movie.id);
    
    const detailHtml = `<div class="detail-card">
        <button class="btn-back" onclick="navigate('movies')">← Назад</button>
        <div class="detail-content">
            <div class="detail-poster">
                <img src="${movie.poster}" class="detail-poster-img" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'450\' viewBox=\'0 0 300 450\'%3E%3Crect width=\'300\' height=\'450\' fill=\'%23434B4D\'/%3E%3Ctext x=\'150\' y=\'225\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-size=\'40\' fill=\'white\'%3E🎬%3C/text%3E%3C/svg%3E\'">
            </div>
            <div class="detail-info">
                <h2>${escapeHtml(movie.title)}</h2>
                <div class="detail-meta">
                    <span>📅 ${movie.year}</span>
                    <span>🎭 ${escapeHtml(movie.genre)}</span>
                    <span>🎂 ${movie.age_rating}</span>
                    <span>🌍 ${escapeHtml(movie.country)}</span>
                </div>
                <div class="stars" style="font-size: 1.2rem;">${renderStars(movie.rating)}</div>
                <div class="card-buttons" style="margin-top: 1rem;">
                    <button class="btn ${isFav ? 'btn-primary' : 'btn-outline'}" onclick="toggleFavorite(${movie.id})">${isFav ? '❤️ В избранном' : '🤍 В избранное'}</button>
                </div>
                <h4>🎬 Режиссёр</h4>
                <p>${escapeHtml(movie.director)}</p>
                ${actorsHtml}
                <div class="detail-description">
                    <h3>📖 Описание</h3>
                    <p>${escapeHtml(movie.description)}</p>
                </div>
            </div>
        </div>
        <div class="reviews-wrapper">
            <h3>📝 Отзывы</h3>
            <div class="review-form-container">
                <h4>Оставить отзыв</h4>
                <input type="text" id="reviewAuthor" placeholder="Ваше имя" value="${currentUser ? currentUser.name : ''}">
                <select id="reviewRating">
                    <option value="">Оценка</option>
                    <option value="10">10 ★★★★★</option><option value="9">9 ★★★★½</option>
                    <option value="8">8 ★★★★</option><option value="7">7 ★★★½</option>
                    <option value="6">6 ★★★</option><option value="5">5 ★★½</option>
                    <option value="4">4 ★★</option><option value="3">3 ★★</option>
                    <option value="2">2 ★</option><option value="1">1 ★</option>
                </select>
                <textarea id="reviewComment" rows="3" placeholder="Ваш отзыв..."></textarea>
                <button class="btn btn-primary" onclick="submitReview(${movie.id})">📝 Оставить</button>
            </div>
        </div>
    </div>`;
    
    document.getElementById('movieDetail').innerHTML = detailHtml;
    showScreen('movieDetailScreen', movie.id);
}

function submitReview(movieId) {
    if (!currentUser) { alert('Войдите в аккаунт'); navigate('login'); return; }
    const author = document.getElementById('reviewAuthor').value || currentUser.name;
    const rating = parseInt(document.getElementById('reviewRating').value);
    const comment = document.getElementById('reviewComment').value;
    if (!rating || rating < 1 || rating > 10) { alert('Выберите оценку'); return; }
    if (!comment.trim()) { alert('Напишите отзыв'); return; }
    if (!userReviews[movieId]) userReviews[movieId] = [];
    userReviews[movieId].push({ author, rating, text: comment });
    saveUserData();
    alert('Отзыв добавлен!');
    showMovieDetail(movieId);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showScreen(screen, movieId) {
    const screens = ['mainScreen', 'registerScreen', 'loginScreen', 'profileScreen', 'moviesScreen', 'favoritesScreen', 'movieDetailScreen'];
    screens.forEach(s => { const el = document.getElementById(s); if (el) el.style.display = 'none'; });
    
    if (screen === 'main') {
        document.getElementById('mainScreen').style.display = 'block';
        renderRecommendationsOnMain();
    } else if (screen === 'register') {
        document.getElementById('registerScreen').style.display = 'block';
    } else if (screen === 'login') {
        document.getElementById('loginScreen').style.display = 'block';
    } else if (screen === 'profile') {
        showProfile();
    } else if (screen === 'movies') {
        document.getElementById('moviesScreen').style.display = 'block';
        applyFilters();
    } else if (screen === 'favorites') {
        document.getElementById('favoritesScreen').style.display = 'block';
        renderFavorites();
    } else if (screen === 'movieDetailScreen') {
        document.getElementById('movieDetailScreen').style.display = 'block';
    }
}

function showProfile() {
    if (!currentUser) { alert('Войдите в аккаунт'); navigate('login'); return; }
    
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileBirthday').value = currentUser.birthday || '';
    document.getElementById('profileGenres').value = currentUser.genres || '';
    
    let reviewsHtml = '';
    for (const movieId in userReviews) {
        const movie = allMovies.find(m => m.id == movieId);
        if (movie) {
            for (let j = 0; j < userReviews[movieId].length; j++) {
                const r = userReviews[movieId][j];
                reviewsHtml += `<div class="review">
                    <div class="review-header">
                        <span class="review-author">🎬 ${escapeHtml(movie.title)}</span>
                        <span class="review-stars">${'★'.repeat(Math.round(r.rating/2))}${'☆'.repeat(5-Math.round(r.rating/2))}</span>
                        <span>${r.rating}/10</span>
                        <button class="delete-review-btn" onclick="deleteReviewFromProfile(${movieId}, ${j})">🗑️</button>
                    </div>
                    <div class="review-text">${escapeHtml(r.text)}</div>
                </div>`;
            }
        }
    }
    document.getElementById('profileReviews').innerHTML = reviewsHtml || '<p>Пока нет отзывов</p>';
    document.getElementById('profileScreen').style.display = 'block';
}

function deleteReviewFromProfile(movieId, reviewIndex) {
    if (userReviews[movieId]?.[reviewIndex]) {
        userReviews[movieId].splice(reviewIndex, 1);
        if (!userReviews[movieId].length) delete userReviews[movieId];
        saveUserData();
        showProfile();
        if (currentMovieId == movieId) showMovieDetail(currentMovieId);
    }
}

function saveProfile() {
    if (!currentUser) { alert('Войдите в аккаунт'); navigate('login'); return; }
    currentUser.name = document.getElementById('profileName').value;
    currentUser.email = document.getElementById('profileEmail').value;
    currentUser.phone = document.getElementById('profilePhone').value;
    currentUser.birthday = document.getElementById('profileBirthday').value;
    currentUser.genres = document.getElementById('profileGenres').value;
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Профиль обновлён!');
    navigate('main');
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const profileLink = document.getElementById('profileLink');
    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (profileLink) profileLink.style.display = 'block';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (profileLink) profileLink.style.display = 'none';
    }
}

function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    const birthday = document.getElementById('regBirthday').value;
    if (!name || !email || password.length < 4) { alert('Заполните все поля'); return; }
    currentUser = { name, email, phone, birthday, genres: "" };
    userReviews = {};
    favorites = [];
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Регистрация прошла успешно!');
    navigate('main');
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { alert('Введите email и пароль'); return; }
    currentUser = { name: "Киноман", email, phone: "+7 (999) 123-45-67", birthday: "1990-01-01", genres: "Фантастика, Боевик, Драма" };
    userReviews = {};
    favorites = [];
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Вход выполнен!');
    navigate('main');
}

function logout() {
    currentUser = null;
    userReviews = {};
    favorites = [];
    localStorage.removeItem('currentScreen');
    localStorage.removeItem('currentMovieId');
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Вы вышли');
    navigate('main');
}

function toggleTheme() {
    const isChecked = document.getElementById('themeToggle').checked;
    if (isChecked) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
}

function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = document.body.classList.contains('dark');
}

function initScrollButtons() {
    document.querySelectorAll('.scroll-btn').forEach(btn => {
        btn.removeEventListener('click', handleScrollClick);
        btn.addEventListener('click', handleScrollClick);
    });
}

function handleScrollClick(e) {
    const btn = e.currentTarget;
    const container = document.getElementById(btn.getAttribute('data-scroll'));
    if (container) container.scrollBy({ left: btn.getAttribute('data-dir') === 'left' ? -350 : 350, behavior: 'smooth' });
}

function initWheelScroll() {
    document.querySelectorAll('.movies-scroll').forEach(scroll => {
        scroll.removeEventListener('wheel', handleWheel);
        scroll.addEventListener('wheel', handleWheel);
    });
}

function handleWheel(e) {
    e.preventDefault();
    this.scrollLeft += e.deltaY > 0 ? 100 : -100;
}

// ========== ЗАПУСК ==========
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', async function() {
    loadUserData();
    initScrollButtons();
    initWheelScroll();
    updateAuthUI();
    initThemeToggle();
    
    await loadAllData();
    handleRoute();
});
