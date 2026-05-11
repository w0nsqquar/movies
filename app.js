let currentScreen = 'main';
let allMovies = [];
let currentMovieId = null;
let currentUser = null;
let userReviews = {};
let favorites = [];
let currentPage = 1;
const itemsPerPage = 20;
let filteredMovies = [];

const API_URL = 'http://localhost:8000/api';

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
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }
    if (savedReviews) {
        userReviews = JSON.parse(savedReviews);
    }
    updateAuthUI();
}

// ========== ЗАГРУЗКА ДАННЫХ ИЗ API ==========
async function loadAllData() {
    try {
        const response = await fetch(API_URL + '/movies/');
        allMovies = await response.json();
        allMovies.sort(function(a, b) { return b.year - a.year; });
        
        var new2026 = allMovies.filter(function(m) { return m.year === 2026; });
        renderScrollMovies('new2026Grid', new2026.slice(0, 15));
        
        var topMovies = [...allMovies].sort(function(a, b) { return b.rating - a.rating; });
        renderScrollMovies('topGrid', topMovies.slice(0, 15));
        
        renderRecommendationsOnMain();
        applyFilters();
        
        setTimeout(function() { initScrollButtons(); initWheelScroll(); }, 100);
    } catch (e) {
        console.error('Ошибка загрузки фильмов:', e);
        document.getElementById('moviesGrid').innerHTML = '<p> Ошибка подключения к серверу. Запустите бэкенд.</p>';
    }
}

function renderScrollMovies(containerId, movieList) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!movieList || movieList.length === 0) {
        container.innerHTML = '<div class="movie-card">Скоро</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < movieList.length; i++) {
        var m = movieList[i];
        html += '<div class="movie-card">' +
            '<div class="movie-poster" onclick="showMovieDetail(' + m.id + ')">' +
            '<img src="' + m.poster + '" alt="' + escapeHtml(m.title) + '" class="poster-img" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'450\' viewBox=\'0 0 300 450\'%3E%3Crect width=\'300\' height=\'450\' fill=\'%23434B4D\'/%3E%3Ctext x=\'150\' y=\'225\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-size=\'40\' fill=\'white\'%3E🎬%3C/text%3E%3C/svg%3E\'">' +
            '</div>' +
            '<div class="movie-info">' +
            '<div class="movie-title">' + escapeHtml(m.title) + '</div>' +
            '<div class="movie-year">' + m.year + ' • ' + m.age_rating + '</div>' +
            '<div class="stars">' + renderStars(m.rating) + '</div>' +
            '<div class="card-buttons">' +
            '<button class="icon-btn ' + (isFavorite(m.id) ? 'favorite' : '') + '" onclick="event.stopPropagation(); toggleFavorite(' + m.id + ')">' + (isFavorite(m.id) ? '❤️' : '🤍') + '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

function renderMoviesList(movieList, containerId, isClickable) {
    if (containerId === undefined) containerId = 'moviesGrid';
    if (isClickable === undefined) isClickable = true;
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!movieList || movieList.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">Ничего не найдено.</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < movieList.length; i++) {
        var m = movieList[i];
        var clickAttr = isClickable ? 'onclick="showMovieDetail(' + m.id + ')"' : '';
        html += '<div class="movie-card">' +
            '<div class="movie-poster" ' + clickAttr + '>' +
            '<img src="' + m.poster + '" alt="' + escapeHtml(m.title) + '" class="poster-img" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'450\' viewBox=\'0 0 300 450\'%3E%3Crect width=\'300\' height=\'450\' fill=\'%23434B4D\'/%3E%3Ctext x=\'150\' y=\'225\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-size=\'40\' fill=\'white\'%3E🎬%3C/text%3E%3C/svg%3E\'">' +
            '</div>' +
            '<div class="movie-info">' +
            '<div class="movie-title">' + escapeHtml(m.title) + '</div>' +
            '<div class="movie-year">' + m.year + ' • ' + m.age_rating + '</div>' +
            '<div class="stars">' + renderStars(m.rating) + '</div>' +
            '<div class="card-buttons">' +
            '<button class="icon-btn ' + (isFavorite(m.id) ? 'favorite' : '') + '" onclick="event.stopPropagation(); toggleFavorite(' + m.id + ')">' + (isFavorite(m.id) ? '❤️' : '🤍') + '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

function renderStars(rating) {
    var starsCount = Math.round(rating / 2);
    var stars = '';
    for (var i = 0; i < 5; i++) {
        stars += i < starsCount ? '★' : '☆';
    }
    return '<span class="stars">' + stars + '</span> <span class="rating-number">' + rating.toFixed(1) + '/10</span>';
}

function isFavorite(movieId) { return favorites.indexOf(movieId) !== -1; }

function toggleFavorite(movieId) {
    if (!currentUser) { 
        alert('Войдите в аккаунт'); 
        showScreen('login'); 
        return; 
    }
    
    var index = favorites.indexOf(movieId);
    if (index !== -1) {
        favorites.splice(index, 1);
        console.log('Удалено из избранного:', movieId);
    } else {
        favorites.push(movieId);
        console.log('Добавлено в избранное:', movieId);
    }
    saveUserData();
    
    var detailFavBtn = document.querySelector('#movieDetail .btn-outline, #movieDetail .btn-primary');
    if (detailFavBtn) {
        var isFav = favorites.indexOf(movieId) !== -1;
        detailFavBtn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        detailFavBtn.className = 'btn ' + (isFav ? 'btn-primary' : 'btn-outline');
    }
    
    var allFavBtns = document.querySelectorAll('.icon-btn');
    for (var i = 0; i < allFavBtns.length; i++) {
        var btn = allFavBtns[i];
        var onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            var match = onclickAttr.match(/toggleFavorite\((\d+)\)/);
            if (match) {
                var id = parseInt(match[1]);
                var isFavNow = favorites.indexOf(id) !== -1;
                btn.textContent = isFavNow ? '❤️' : '🤍';
                if (isFavNow) {
                    btn.classList.add('favorite');
                } else {
                    btn.classList.remove('favorite');
                }
            }
        }
    }
    
    if (document.getElementById('favoritesScreen').style.display === 'block') {
        renderFavorites();
    }
}

function renderFavorites() {
    var favMovies = allMovies.filter(function(m) { return favorites.indexOf(m.id) !== -1; });
    renderMoviesList(favMovies, 'favoritesGrid', true);
}

function renderRecommendationsOnMain() {
    if (!currentUser) {
        document.getElementById('recommendationsGrid').innerHTML = '<div class="recommendation-placeholder"><div class="recommendation-message">Войдите в аккаунт</div><button class="btn-small" onclick="showScreen(\'login\')">Войти</button></div>';
        return;
    }
    if (!currentUser.genres || currentUser.genres === '') {
        document.getElementById('recommendationsGrid').innerHTML = '<div class="recommendation-placeholder"><div class="recommendation-message">Укажите любимые жанры в профиле</div><button class="btn-small" onclick="showScreen(\'profile\')">Редактировать</button></div>';
        return;
    }
    var userGenres = currentUser.genres.toLowerCase().split(/[ ,]+/);
    var recommended = allMovies.filter(function(m) {
        return userGenres.some(function(g) { return m.genre.toLowerCase().indexOf(g) !== -1; });
    });
    recommended.sort(function(a, b) { return b.rating - a.rating; });
    renderScrollMovies('recommendationsGrid', recommended.slice(0, 12));
}

function searchMovies() {
    var query = document.getElementById('searchQuery').value.toLowerCase().trim();
    var filtered = allMovies.slice();
    if (query !== '') {
        filtered = filtered.filter(function(m) {
            return m.title.toLowerCase().indexOf(query) !== -1 ||
                m.genre.toLowerCase().indexOf(query) !== -1 ||
                m.year.toString().indexOf(query) !== -1 ||
                (m.director && m.director.toLowerCase().indexOf(query) !== -1);
        });
    }
    var genre = document.getElementById('filterGenre') ? document.getElementById('filterGenre').value : 'all';
    var year = document.getElementById('filterYear') ? document.getElementById('filterYear').value : 'all';
    var age = document.getElementById('filterAge') ? document.getElementById('filterAge').value : 'all';
    var country = document.getElementById('filterCountry') ? document.getElementById('filterCountry').value : 'all';
    var sort = document.getElementById('sortBy') ? document.getElementById('sortBy').value : 'rating';
    
    if (genre !== 'all') filtered = filtered.filter(function(m) { return m.genre === genre; });
    if (age !== 'all') filtered = filtered.filter(function(m) { return m.age_rating === age; });
    if (country !== 'all') filtered = filtered.filter(function(m) { return m.country === country; });
    
    if (year !== 'all') {
        if (year === '2010-2020') filtered = filtered.filter(function(m) { return m.year >= 2010 && m.year <= 2020; });
        else if (year === '2000-2010') filtered = filtered.filter(function(m) { return m.year >= 2000 && m.year <= 2010; });
        else filtered = filtered.filter(function(m) { return m.year.toString() === year; });
    }
    
    if (sort === 'rating') filtered.sort(function(a, b) { return b.rating - a.rating; });
    else if (sort === 'rating_asc') filtered.sort(function(a, b) { return a.rating - b.rating; });
    else if (sort === 'year') filtered.sort(function(a, b) { return b.year - a.year; });
    else if (sort === 'year_asc') filtered.sort(function(a, b) { return a.year - b.year; });
    else if (sort === 'title') filtered.sort(function(a, b) { return a.title.localeCompare(b.title); });
    
    filteredMovies = filtered;
    currentPage = 1;
    renderPaginatedMovies();
}

function applyFilters() { searchMovies(); }

function renderPaginatedMovies() {
    var start = (currentPage - 1) * itemsPerPage;
    var end = start + itemsPerPage;
    var pageMovies = filteredMovies.slice(start, end);
    renderMoviesList(pageMovies, 'moviesGrid', true);
    
    var totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    var pagination = document.getElementById('pagination');
    if (pagination && totalPages > 1) {
        var html = '';
        for (var i = 1; i <= Math.min(totalPages, 10); i++) {
            html += '<button class="pagination-btn ' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
        }
        pagination.innerHTML = html;
    } else if (pagination) {
        pagination.innerHTML = '';
    }
}

function goToPage(page) { currentPage = page; renderPaginatedMovies(); }

function resetFilters() {
    if (document.getElementById('filterGenre')) document.getElementById('filterGenre').value = 'all';
    if (document.getElementById('filterYear')) document.getElementById('filterYear').value = 'all';
    if (document.getElementById('filterAge')) document.getElementById('filterAge').value = 'all';
    if (document.getElementById('filterCountry')) document.getElementById('filterCountry').value = 'all';
    if (document.getElementById('sortBy')) document.getElementById('sortBy').value = 'rating';
    document.getElementById('searchQuery').value = '';
    filteredMovies = allMovies.slice();
    currentPage = 1;
    renderPaginatedMovies();
}

function showMovieDetail(id) {
    currentMovieId = id;
    localStorage.setItem('currentMovieId', id);
    var movie = null;
    for (var i = 0; i < allMovies.length; i++) {
        if (allMovies[i].id === id) { movie = allMovies[i]; break; }
    }
    if (!movie) return;
    
    var userReviewsHtml = '';
    if (userReviews[id] && userReviews[id].length > 0) {
        userReviewsHtml = '<h4>Ваши отзывы:</h4>';
        for (var j = 0; j < userReviews[id].length; j++) {
            var r = userReviews[id][j];
            userReviewsHtml += '<div class="review user-review">' +
                '<div class="review-header">' +
                '<span class="review-author">👤 ' + escapeHtml(r.author) + '</span>' +
                '<span class="review-stars">' + '★'.repeat(Math.round(r.rating/2)) + '☆'.repeat(5-Math.round(r.rating/2)) + '</span>' +
                '<span>' + r.rating + '/10</span>' +
                '<button class="delete-review-btn" onclick="event.stopPropagation(); deleteReview(' + id + ', ' + j + ')">🗑️</button>' +
                '</div>' +
                '<div class="review-text">' + escapeHtml(r.text) + '</div>' +
                '</div>';
        }
    }
    
    var sampleReviews = [
        { author: "Алексей", rating: 9, text: "Отличный фильм!" },
        { author: "Мария", rating: 8, text: "Хорошее кино" },
        { author: "Дмитрий", rating: 10, text: "Шедевр!" }
    ];
    
    var reviewsHtml = '';
    if (userReviewsHtml) reviewsHtml += userReviewsHtml;
    reviewsHtml += '<h4>👥 Отзывы зрителей:</h4>';
    for (var k = 0; k < sampleReviews.length; k++) {
        var r2 = sampleReviews[k];
        reviewsHtml += '<div class="review">' +
            '<div class="review-header">' +
            '<span class="review-author">👤 ' + escapeHtml(r2.author) + '</span>' +
            '<span class="review-stars">' + '★'.repeat(Math.round(r2.rating/2)) + '☆'.repeat(5-Math.round(r2.rating/2)) + '</span>' +
            '<span>' + r2.rating + '/10</span>' +
            '</div>' +
            '<div class="review-text">' + escapeHtml(r2.text) + '</div>' +
            '</div>';
    }
    
    var actorsHtml = '';
    if (movie.actors && movie.actors.length) {
        actorsHtml = '<h4 class="actors-title">⭐ В ролях</h4><ul class="actors-list">';
        for (var a = 0; a < movie.actors.length; a++) {
            actorsHtml += '<li>' + escapeHtml(movie.actors[a]) + '</li>';
        }
        actorsHtml += '</ul>';
    }
    
    var detailHtml = '<div class="detail-card">' +
        '<button class="btn-back" onclick="showScreen(\'movies\')">← Назад</button>' +
        '<div class="detail-content">' +
        '<div class="detail-poster">' +
        '<img src="' + movie.poster + '" alt="' + escapeHtml(movie.title) + '" class="detail-poster-img" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'450\' viewBox=\'0 0 300 450\'%3E%3Crect width=\'300\' height=\'450\' fill=\'%23434B4D\'/%3E%3Ctext x=\'150\' y=\'225\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-size=\'40\' fill=\'white\'%3E🎬%3C/text%3E%3C/svg%3E\'">' +
        '</div>' +
        '<div class="detail-info">' +
        '<h2>' + escapeHtml(movie.title) + '</h2>' +
        '<div class="detail-meta">' +
        '<span>📅 ' + movie.year + '</span>' +
        '<span>🎭 ' + escapeHtml(movie.genre) + '</span>' +
        '<span>🎂 ' + movie.age_rating + '</span>' +
        '<span>🌍 ' + escapeHtml(movie.country) + '</span>' +
        '</div>' +
        '<div class="stars" style="font-size: 1.2rem;">' + renderStars(movie.rating) + '</div>' +
        '<div class="card-buttons" style="margin-top: 1rem;">' +
        '<button class="btn btn-outline" onclick="toggleFavorite(' + movie.id + ')">' + (isFavorite(movie.id) ? '❤️ В избранном' : '🤍 В избранное') + '</button>' +
        '</div>' +
        '<h4>🎬 Режиссёр</h4>' +
        '<p>' + escapeHtml(movie.director) + '</p>' +
        actorsHtml +
        '<div class="detail-description">' +
        '<h3>📖 Описание</h3>' +
        '<p>' + escapeHtml(movie.description) + '</p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="reviews-wrapper">' +
        '<h3>📝 Отзывы</h3>' +
        reviewsHtml +
        '<div class="review-form-container">' +
        '<h4>Оставить отзыв</h4>' +
        '<input type="text" id="reviewAuthor" placeholder="Ваше имя" value="' + (currentUser ? currentUser.name : '') + '">' +
        '<select id="reviewRating">' +
        '<option value="">Оценка</option>' +
        '<option value="10">10 ★★★★★</option><option value="9">9 ★★★★½</option><option value="8">8 ★★★★</option><option value="7">7 ★★★½</option>' +
        '<option value="6">6 ★★★</option><option value="5">5 ★★½</option><option value="4">4 ★★</option><option value="3">3 ★★</option>' +
        '<option value="2">2 ★</option><option value="1">1 ★</option>' +
        '</select>' +
        '<textarea id="reviewComment" rows="3" placeholder="Ваш отзыв..."></textarea>' +
        '<button class="btn btn-primary" onclick="submitReview(' + movie.id + ')">📝 Оставить</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    document.getElementById('movieDetail').innerHTML = detailHtml;
    showScreen('movieDetailScreen');
}

function deleteReview(movieId, reviewIndex) {
    if (userReviews[movieId] && userReviews[movieId][reviewIndex]) {
        userReviews[movieId].splice(reviewIndex, 1);
        if (userReviews[movieId].length === 0) delete userReviews[movieId];
        saveUserData();
        showMovieDetail(movieId);
    }
}

function submitReview(movieId) {
    if (!currentUser) { alert('Войдите в аккаунт'); showScreen('login'); return; }
    var author = document.getElementById('reviewAuthor').value || currentUser.name;
    var rating = parseInt(document.getElementById('reviewRating').value);
    var comment = document.getElementById('reviewComment').value;
    if (!rating || rating < 1 || rating > 10) { alert('Выберите оценку'); return; }
    if (!comment.trim()) { alert('Напишите отзыв'); return; }
    if (!userReviews[movieId]) userReviews[movieId] = [];
    userReviews[movieId].push({ author: author, rating: rating, text: comment });
    saveUserData();
    alert('Отзыв добавлен!');
    document.getElementById('reviewAuthor').value = '';
    document.getElementById('reviewRating').value = '';
    document.getElementById('reviewComment').value = '';
    showMovieDetail(movieId);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showScreen(screen) {
    var screens = ['mainScreen', 'registerScreen', 'loginScreen', 'profileScreen', 'moviesScreen', 'favoritesScreen', 'movieDetailScreen'];
    for (var i = 0; i < screens.length; i++) {
        var el = document.getElementById(screens[i]);
        if (el) el.style.display = 'none';
    }
    
    if (screen === 'main') {
        document.getElementById('mainScreen').style.display = 'block';
        renderRecommendationsOnMain();
        localStorage.setItem('currentScreen', 'main');
    } else if (screen === 'register') {
        document.getElementById('registerScreen').style.display = 'block';
        localStorage.setItem('currentScreen', 'register');
    } else if (screen === 'login') {
        document.getElementById('loginScreen').style.display = 'block';
        localStorage.setItem('currentScreen', 'login');
    } else if (screen === 'profile') {
        showProfile();
        localStorage.setItem('currentScreen', 'profile');
    } else if (screen === 'movies') {
        document.getElementById('moviesScreen').style.display = 'block';
        applyFilters();
        localStorage.setItem('currentScreen', 'movies');
    } else if (screen === 'favorites') {
        document.getElementById('favoritesScreen').style.display = 'block';
        renderFavorites();
        localStorage.setItem('currentScreen', 'favorites');
    } else if (screen === 'movieDetailScreen') {
        document.getElementById('movieDetailScreen').style.display = 'block';
        localStorage.setItem('currentScreen', 'movieDetailScreen');
        localStorage.setItem('currentMovieId', currentMovieId);
    }
}

function restoreLastScreen() {
    var savedScreen = localStorage.getItem('currentScreen');
    var savedMovieId = localStorage.getItem('currentMovieId');
    
    if (savedScreen === 'movieDetailScreen' && savedMovieId) {
        var movie = null;
        for (var i = 0; i < allMovies.length; i++) {
            if (allMovies[i].id == parseInt(savedMovieId)) { movie = allMovies[i]; break; }
        }
        if (movie) showMovieDetail(movie.id);
        else showScreen('main');
    } else if (savedScreen === 'profile') {
        if (currentUser) showScreen('profile');
        else showScreen('main');
    } else if (savedScreen === 'favorites') {
        showScreen('favorites');
    } else if (savedScreen === 'movies') {
        showScreen('movies');
    } else if (savedScreen === 'login') {
        showScreen('login');
    } else if (savedScreen === 'register') {
        showScreen('register');
    } else {
        showScreen('main');
    }
}

function showProfile() {
    if (!currentUser) { alert('Войдите в аккаунт'); showScreen('login'); return; }
    
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileBirthday').value = currentUser.birthday || '';
    document.getElementById('profileGenres').value = currentUser.genres || '';
    
    var reviewsHtml = '';
    for (var movieId in userReviews) {
        var movie = null;
        for (var i = 0; i < allMovies.length; i++) {
            if (allMovies[i].id == parseInt(movieId)) { movie = allMovies[i]; break; }
        }
        if (movie) {
            for (var j = 0; j < userReviews[movieId].length; j++) {
                var r = userReviews[movieId][j];
                reviewsHtml += '<div class="review">' +
                    '<div class="review-header">' +
                    '<span class="review-author">🎬 ' + escapeHtml(movie.title) + '</span>' +
                    '<span class="review-stars">' + '★'.repeat(Math.round(r.rating/2)) + '☆'.repeat(5-Math.round(r.rating/2)) + '</span>' +
                    '<span>' + r.rating + '/10</span>' +
                    '<button class="delete-review-btn" onclick="deleteReviewFromProfile(' + movieId + ', ' + j + ')">🗑️</button>' +
                    '</div>' +
                    '<div class="review-text">' + escapeHtml(r.text) + '</div>' +
                    '</div>';
            }
        }
    }
    document.getElementById('profileReviews').innerHTML = reviewsHtml || '<p>Пока нет отзывов</p>';
    
    document.getElementById('profileScreen').style.display = 'block';
}

function deleteReviewFromProfile(movieId, reviewIndex) {
    if (userReviews[movieId] && userReviews[movieId][reviewIndex]) {
        userReviews[movieId].splice(reviewIndex, 1);
        if (userReviews[movieId].length === 0) delete userReviews[movieId];
        saveUserData();
        showProfile();
        if (currentMovieId === parseInt(movieId)) showMovieDetail(currentMovieId);
    }
}

function saveProfile() {
    if (!currentUser) { alert('Войдите в аккаунт'); showScreen('login'); return; }
    currentUser.name = document.getElementById('profileName').value;
    currentUser.email = document.getElementById('profileEmail').value;
    currentUser.phone = document.getElementById('profilePhone').value;
    currentUser.birthday = document.getElementById('profileBirthday').value;
    currentUser.genres = document.getElementById('profileGenres').value;
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Профиль обновлён!');
    showScreen('main');
}

function updateAuthUI() {
    var authButtons = document.getElementById('authButtons');
    var profileLink = document.getElementById('profileLink');
    
    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (profileLink) profileLink.style.display = 'block';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (profileLink) profileLink.style.display = 'none';
    }
}

function register() {
    var name = document.getElementById('regName').value;
    var email = document.getElementById('regEmail').value;
    var password = document.getElementById('regPassword').value;
    var phone = document.getElementById('regPhone').value;
    var birthday = document.getElementById('regBirthday').value;
    if (!name || !email || password.length < 4) { alert('Заполните все поля'); return; }
    currentUser = { name: name, email: email, phone: phone, birthday: birthday, genres: "" };
    userReviews = {}; favorites = [];
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Регистрация прошла успешно!');
    showScreen('main');
}

function login() {
    var email = document.getElementById('loginEmail').value;
    var password = document.getElementById('loginPassword').value;
    if (!email || !password) { alert('Введите email и пароль'); return; }
    currentUser = { name: "Киноман", email: email, phone: "+7 (999) 123-45-67", birthday: "1990-01-01", genres: "Фантастика, Боевик, Драма" };
    userReviews = {}; favorites = [];
    saveUserData();
    updateAuthUI();
    renderRecommendationsOnMain();
    alert('Вход выполнен!');
    showScreen('main');
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
    showScreen('main');
}

function toggleTheme() {
    const isChecked = document.getElementById('themeToggle').checked;
    
    if (isChecked) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}

function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.checked = document.body.classList.contains('dark');
    }
}

function initScrollButtons() {
    var btns = document.querySelectorAll('.scroll-btn');
    for (var i = 0; i < btns.length; i++) {
        var btn = btns[i];
        btn.removeEventListener('click', handleScrollClick);
        btn.addEventListener('click', handleScrollClick);
    }
}

function handleScrollClick(e) {
    var btn = e.currentTarget;
    var scrollId = btn.getAttribute('data-scroll');
    var direction = btn.getAttribute('data-dir');
    var container = document.getElementById(scrollId);
    if (container) {
        var scrollAmount = direction === 'left' ? -350 : 350;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

function initWheelScroll() {
    var scrolls = document.querySelectorAll('.movies-scroll');
    for (var i = 0; i < scrolls.length; i++) {
        var scroll = scrolls[i];
        scroll.removeEventListener('wheel', handleWheel);
        scroll.addEventListener('wheel', handleWheel);
    }
}

function handleWheel(e) {
    e.preventDefault();
    this.scrollLeft += e.deltaY > 0 ? 100 : -100;
}

document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    loadAllData();
    initScrollButtons();
    initWheelScroll();
    updateAuthUI();
    restoreLastScreen();
    initThemeToggle();  
});
