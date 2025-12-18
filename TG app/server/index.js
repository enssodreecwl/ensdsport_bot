const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/database.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../static')));

// Подключение к базе данных
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключение к БД успешно');
    }
});

// API: Получить прогнозы
app.get('/api/forecasts', (req, res) => {
    const { sport, is_vip, user_id } = req.query;
    let query = SELECT * FROM forecasts WHERE 1=1;
    const params = [];

    if (sport && sport !== 'all') {
        query +=  AND sport = ?;
        params.push(sport);
    }

    if (is_vip === 'true') {
        query +=  AND is_vip = 1;
    } else if (is_vip === 'false') {
        query +=  AND is_vip = 0;
    }

    query +=  ORDER BY created_at DESC LIMIT 50;

    db.all(query, params, (err, forecasts) => {
        if (err) {
            console.error('❌ Ошибка получения прогнозов:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }

        // Если передан user_id, отмечаем просмотренные прогнозы
        if (user_id) {
            db.all(
                SELECT forecast_id FROM views WHERE user_id IN (SELECT id FROM users WHERE telegram_id = ?),
                [user_id],
                (err, views) => {
                    if (err) {
                        console.error('❌ Ошибка получения просмотров:', err);
                        return res.json(forecasts);
                    }

                    const viewedIds = views.map(v => v.forecast_id);
                    const enhancedForecasts = forecasts.map(forecast => ({
                        ...forecast,
                        viewed: viewedIds.includes(forecast.id)
                    }));

                    res.json(enhancedForecasts);
                }
            );
        } else {
            res.json(forecasts);
        }
    });
});

// API: Получить информацию о пользователе
app.get('/api/user/:telegram_id', (req, res) => {
    const telegram_id = req.params.telegram_id;

    db.get(
        SELECT id, telegram_id, username, balance, daily_streak, vip_expiry FROM users WHERE telegram_id = ?,
        [telegram_id],
        (err, user) => {
            if (err) {
                console.error('❌ Ошибка получения пользователя:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }

            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // Проверяем VIP статус
            const is_vip = user.vip_expiry && new Date(user.vip_expiry) > new Date();

            res.json({
                ...user,
                is_vip,
                vip_expiry: user.vip_expiry || null
            });
        }
    );
});

// API: Отметить прогноз как просмотренный
app.post('/api/view', (req, res) => {
    const { user_id, forecast_id } = req.body;

    if (!user_id || !forecast_id) {
        return res.status(400).json({ error: 'Необходимы user_id и forecast_id' });
    }

    // Проверяем, не смотрел ли уже
    db.get(
        SELECT id FROM views WHERE user_id = ? AND forecast_id = ?,
        [user_id, forecast_id],
        (err, view) => {
            if (err) {
                console.error('❌ Ошибка проверки просмотра:', err);
                return res.status(500).json({ error: 'Ошибка сервера' });
            }

            if (view) {
                return res.json({ success: false, message: 'Уже просмотрено' });
            }

            // Добавляем просмотр
            db.run(
                INSERT INTO views (user_id, forecast_id) VALUES (?, ?),
                [user_id, forecast_id],
                function(err) {
                    if (err) {console.error('❌ Ошибка добавления просмотра:', err);
                        return res.status(500).json({ error: 'Ошибка сервера' });
                    }

                    // Начисляем баллы
                    db.run(
                        UPDATE users SET balance = balance + 2 WHERE id = ?,
                        [user_id],
                        (err) => {
                            if (err) {
                                console.error('❌ Ошибка начисления баллов:', err);
                            }

                            res.json({ 
                                success: true, 
                                message: '+2 балла за просмотр',
                                balance_updated: true
                            });
                        }
                    );
                }
            );
        }
    );
});

// API: Админ - добавить прогноз
app.post('/api/admin/forecast', (req, res) => {
    const { 
        sport, 
        league, 
        match, 
        prediction, 
        coefficient, 
        confidence, 
        comment, 
        is_vip,
        admin_id 
    } = req.body;

    // Проверка прав администратора
    db.get(
        SELECT id FROM admins WHERE telegram_id = ?,
        [admin_id],
        (err, admin) => {
            if (err || !admin) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }

            // Добавляем прогноз
            db.run(
                `INSERT INTO forecasts (sport, league, match, prediction, coefficient, confidence, comment, is_vip) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [sport, league, match, prediction, coefficient, confidence, comment, is_vip ? 1 : 0],
                function(err) {
                    if (err) {
                        console.error('❌ Ошибка добавления прогноза:', err);
                        return res.status(500).json({ error: 'Ошибка сервера' });
                    }

                    res.json({ 
                        success: true, 
                        message: 'Прогноз добавлен',
                        forecast_id: this.lastID
                    });
                }
            );
        }
    );
});

// API: Админ - статистика
app.get('/api/admin/stats', (req, res) => {
    const { admin_id } = req.query;

    // Проверка прав администратора
    db.get(
        SELECT id FROM admins WHERE telegram_id = ?,
        [admin_id],
        (err, admin) => {
            if (err || !admin) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }

            const stats = {};

            // Получаем статистику
            db.serialize(() => {
                db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                    if (!err) stats.total_users = row.count;
                });

                db.get(`SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')`, (err, row) => {
                    if (!err) stats.new_users_today = row.count;
                });

                db.get(`SELECT COUNT(*) as count FROM forecasts`, (err, row) => {
                    if (!err) stats.total_forecasts = row.count;
                });

                db.get(`SELECT COUNT(*) as count FROM forecasts WHERE is_vip = 1`, (err, row) => {
                    if (!err) stats.vip_forecasts = row.count;
                });

                db.get(`SELECT SUM(balance) as total FROM users`, (err, row) => {
                    if (!err) stats.total_balance = row.total || 0;
                });

                db.get(`SELECT COUNT(*) as count FROM views`, (err, row) => {
                    if (!err) stats.total_views = row.count;
                });

                // Ждем завершения всех запросов
                setTimeout(() => {
                    res.json(stats);
                }, 100);
            });
        }
    );
});

// Главная страница
app.get('/', (req, res) => {
    const user_id = req.query.user_id;
    const is_admin = req.query.admin === 'true';
    
    if (is_admin) {
        res.sendFile(path.join(__dirname, '../templates/admin.html'));
    } else {
        res.sendFile(path.join(__dirname, '../templates/index.html'));
    }
});

// Страница админки
app.get('/admin', (req, res) => {
    const user_id = req.query.user_id;
    
    // Проверяем права администратора
    db.get(
        SELECT id FROM admins WHERE telegram_id = ?,
        [user_id],
        (err, admin) => {
            if (err || !admin) {
                return res.status(403).send('Доступ запрещен');
            }
            
            res.sendFile(path.join(__dirname, '../templates/admin.html'));
        }
    );
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Mini App доступен по: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api/forecasts`);
});
