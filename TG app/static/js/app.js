// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
let userId = null;

// Получаем ID пользователя из URL
function getUserId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('user_id');
}

// Инициализация приложения
async function initApp() {
    userId = getUserId();
    
    if (!userId) {
        showError('Не удалось получить ID пользователя');
        return;
    }
    
    // Загружаем данные пользователя
    await loadUserData();
    
    // Загружаем прогнозы
    await loadForecasts();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Показываем приветственное сообщение
    showNotification('👋 Добро пожаловать в ENSD SPORT!', 'success');
}

// Загружаем данные пользователя
async function loadUserData() {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const userData = await response.json();
        
        // Обновляем интерфейс
        document.getElementById('userBalance').textContent = userData.balance || 0;
        document.getElementById('dailyStreak').textContent = `🔥 Серия: ${userData.daily_streak || 0} дней`;
        
        // Сохраняем данные пользователя
        window.userData = userData;
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// Загружаем прогнозы
async function loadForecasts(sport = 'all', isVip = null) {
    const forecastsList = document.getElementById('forecastsList');
    forecastsList.innerHTML = '<div class="loading">Загрузка прогнозов...</div>';
    
    try {
        let url = `/api/forecasts?user_id=${userId}`;
        if (sport !== 'all') url += `&sport=${sport}`;
        if (isVip !== null) url += `&is_vip=${isVip}`;
        
        const response = await fetch(url);
        const forecasts = await response.json();
        
        if (forecasts.length === 0) {
            forecastsList.innerHTML = '<div class="no-forecasts">Нет доступных прогнозов</div>';
            return;
        }
        
        // Отображаем прогнозы
        renderForecasts(forecasts);
        
        // Обновляем статистику
        updateStats(forecasts);
    } catch (error) {
        console.error('Ошибка загрузки прогнозов:', error);
        forecastsList.innerHTML = '<div class="error">Ошибка загрузки прогнозов</div>';
    }
}

// Отображаем прогнозы
function renderForecasts(forecasts) {
    const forecastsList = document.getElementById('forecastsList');
    forecastsList.innerHTML = '';
    
    forecasts.forEach(forecast => {
        const forecastCard = createForecastCard(forecast);
        forecastsList.appendChild(forecastCard);
    });
}

// Создаем карточку прогноза
function createForecastCard(forecast) {
    const card = document.createElement('div');
    card.className = `forecast-card ${forecast.is_vip ? 'vip' : ''} ${forecast.viewed ? 'viewed' : ''}`;
    card.dataset.id = forecast.id;
    
    const sportIcon = forecast.sport === 'football' ? '⚽' : '🏒';
    const vipBadge = forecast.is_vip ? '<span class="vip-badge">⭐ VIP</span>' : '';
    const viewedBadge = forecast.viewed ? '<span class="viewed-badge">👁 Просмотрено</span>' : '';
    
    card.innerHTML = `
        <div class="forecast-header">
            <div class="sport-icon">${sportIcon}</div>
            <div class="match-info">
                <h3>${forecast.match}</h3>
                <div class="league">${forecast.league}</div>
            </div>
            ${vipBadge}
            ${viewedBadge}
        </div>
        
        <div class="forecast-details">
            <div class="detail-item">
                <div class="detail-label">Прогноз</div>
                <div class="detail-value">${forecast.prediction}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Коэффициент</div>
                <div class="detail-value coefficient">${forecast.coefficient}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Уверенность</div>
                <div class="detail-value confidence">${forecast.confidence}/10</div>
            </div>
        </div>
        
        ${forecast.comment ? `<div class="comment">💬 ${forecast.comment}</div>` : ''}
    `;
    
    // Обработчик клика
    card.addEventListener('click', () => openForecastModal(forecast));
    
    return card;
}

// Открываем модальное окно с прогнозом
async function openForecastModal(forecast) {
    // Если прогноз уже просмотрен, просто показываем
    if (forecast.viewed) {
        showForecastDetails(forecast);
        return;
    }
    
    // Отмечаем как просмотренный и начисляем баллы
    try {
        const response = await fetch('/api/view', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: window.userData?.id || userId,
                forecast_id: forecast.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Обновляем баланс
            window.userData.balance += 2;
            document.getElementById('userBalance').textContent = window.userData.balance;
            
            // Показываем уведомление
            showNotification('🎉 +2 балла за просмотр прогноза!', 'success');
            
            // Отмечаем карточку как просмотренную
            const card = document.querySelector(`.forecast-card[data-id="${forecast.id}"]`);
            if (card) {
                card.classList.add('viewed');
                card.innerHTML += '<span class="viewed-badge">👁 Просмотрено</span>';
            }
        }
    } catch (error) {
        console.error('Ошибка при просмотре:', error);
    }
    
    // Показываем детали прогноза
    showForecastDetails(forecast);
}

// Показываем детали прогноза
function showForecastDetails(forecast) {
    const modal = document.getElementById('forecastModal');
    const modalContent = document.getElementById('modalContent');
    
    const sportIcon = forecast.sport === 'football' ? '⚽' : '🏒';
    const vipText = forecast.is_vip ? '<div class="vip-notice">⭐ VIP ПРОГНОЗ</div>' : '';
    
    modalContent.innerHTML = `
        ${vipText}
        <div class="modal-header">
            <h2>${sportIcon} ${forecast.match}</h2>
            <div class="modal-league">${forecast.league}</div>
        </div>
        
        <div class="modal-details">
            <div class="modal-row">
                <div class="modal-label">Прогноз:</div>
                <div class="modal-value big">${forecast.prediction}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Коэффициент:</div>
                <div class="modal-value green">${forecast.coefficient}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Уверенность:</div>
                <div class="modal-value">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${forecast.confidence * 10}%"></div>
                        <span>${forecast.confidence}/10</span>
                    </div>
                </div>
            </div>
            
            ${forecast.comment ? `
            <div class="modal-row">
                <div class="modal-label">Комментарий:</div>
                <div class="modal-comment">${forecast.comment}</div>
            </div>
            ` : ''}
            
            <div class="modal-row">
                <div class="modal-label">Дата добавления:</div>
                <div class="modal-value">${new Date(forecast.created_at).toLocaleDateString()}</div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Настраиваем обработчики событий
function setupEventListeners() {
    // Фильтрация по вкладкам
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Убираем активный класс у всех вкладок
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            
            // Добавляем активный класс текущей вкладке
            this.classList.add('active');
            
            // Загружаем прогнозы по фильтру
            const sport = this.dataset.sport;
            const isVip = this.dataset.vip;
            
            loadForecasts(sport || 'all', isVip);
        });
    });
    
    // Кнопка ежедневного бонуса
    document.getElementById('dailyBonusBtn').addEventListener('click', async function() {
        try {
            // Здесь нужно добавить API для получения ежедневного бонуса
            showNotification('🎁 Ежедневный бонус будет доступен в следующих версиях', 'success');
        } catch (error) {
            showNotification('❌ Ошибка получения бонуса', 'error');
        }
    });
    
    // Кнопка VIP
    document.getElementById('getVipBtn').addEventListener('click', function() {
        showNotification('⭐ VIP доступ будет доступен в следующих версиях', 'success');
    });
    
    // Закрытие модального окна
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('forecastModal').style.display = 'none';
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('forecastModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Обновляем статистику
function updateStats(forecasts) {
    const viewedCount = forecasts.filter(f => f.viewed).length;
    const earnedPoints = viewedCount * 2;
    
    document.getElementById('viewedCount').textContent = viewedCount;
    document.getElementById('earnedPoints').textContent = earnedPoints;
}

// Показываем уведомление
function showNotification(message, type = 'success') {
    // Удаляем старое уведомление
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) oldNotification.remove();
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.animation =