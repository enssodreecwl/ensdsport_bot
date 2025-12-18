const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Подключение к базе данных
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/database.db');
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключение к БД успешно');
        initDatabase();
    }
});

// Инициализация базы данных
function initDatabase() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE,
            username TEXT,
            email TEXT,
            balance INTEGER DEFAULT 0,
            daily_streak INTEGER DEFAULT 0,
            last_daily DATE,
            vip_expiry DATE,
            referral_code TEXT UNIQUE,
            referred_by INTEGER,
            total_points INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица прогнозов
        db.run(`CREATE TABLE IF NOT EXISTS forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sport TEXT CHECK(sport IN ('football', 'hockey', 'basketball', 'tennis')),
            league TEXT,
            match TEXT NOT NULL,
            prediction TEXT NOT NULL,
            coefficient REAL NOT NULL,
            confidence INTEGER CHECK(confidence >= 1 AND confidence <= 10),
            comment TEXT,
            result TEXT CHECK(result IN ('win', 'loss', 'pending', 'void')),
            is_vip BOOLEAN DEFAULT 0,
            is_premium BOOLEAN DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            match_time TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица просмотров
        db.run(`CREATE TABLE IF NOT EXISTS views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            forecast_id INTEGER,
            viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            points_earned INTEGER DEFAULT 2,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (forecast_id) REFERENCES forecasts (id),
            UNIQUE(user_id, forecast_id)
        )`);

        // Таблица админов
        db.run(`CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE,
            role TEXT CHECK(role IN ('superadmin', 'admin', 'moderator')) DEFAULT 'admin',
            permissions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица транзакций (баллы)
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT CHECK(type IN ('daily', 'view', 'referral', 'purchase', 'withdrawal', 'bonus', 'penalty')),
            amount INTEGER,
            description TEXT,
            forecast_id INTEGER,
            referral_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Таблица избранного
        db.run(`CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            forecast_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (forecast_id) REFERENCES forecasts (id),
            UNIQUE(user_id, forecast_id)
        )`);

        // Таблица спортивных лиг
        db.run(`CREATE TABLE IF NOT EXISTS leagues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sport TEXT,
            name TEXT,
            country TEXT,
            logo_url TEXT,
            is_active BOOLEAN DEFAULT 1
        )`);

        // Таблица VIP подписок
        db.run(`CREATE TABLE IF NOT EXISTS vip_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            plan TEXT CHECK(plan IN ('weekly', 'monthly', 'yearly')),
            start_date DATE,
            end_date DATE,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Создание индексов для оптимизации
        db.run('CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_forecasts_sport ON forecasts(sport)');
        db.run('CREATE INDEX IF NOT EXISTS idx_forecasts_vip ON forecasts(is_vip)');
        db.run('CREATE INDEX IF NOT EXISTS idx_forecasts_time ON forecasts(match_time)');
        db.run('CREATE INDEX IF NOT EXISTS idx_views_user ON views(user_id)');
        db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)');
    });
}

// ==================== ПРОВЕРКА АДМИНА ====================
function checkAdmin(req, res, next) {
    const adminId = req.query.admin_id || req.body.admin_id;
    
    if (!adminId) {
        return res.status(401).json({ error: 'Требуется идентификация администратора' });
    }
    
    db.get('SELECT * FROM admins WHERE telegram_id = ?', [adminId], (err, admin) => {
        if (err || !admin) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        req.admin = admin;
        next();
    });
}

// ==================== ПОЛЬЗОВАТЕЛИ ====================

// Получить профиль пользователя
router.get('/user/:telegram_id', (req, res) => {
    const telegramId = req.params.telegram_id;
    
    db.get(`
        SELECT 
            u.*,
            COUNT(DISTINCT v.id) as total_views,
            COUNT(DISTINCT f.id) as total_favorites,
            (SELECT COUNT(*) FROM vip_subscriptions vs WHERE vs.user_id = u.id AND vs.is_active = 1) as has_vip
        FROM users u
        LEFT JOIN views v ON v.user_id = u.id
        LEFT JOIN favorites f ON f.user_id = u.id
        WHERE u.telegram_id = ?
        GROUP BY u.id
    `, [telegramId], (err, user) => {
        if (err) {
            console.error('Ошибка получения пользователя:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Обновляем last_seen
        db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        
        // Получаем статистику пользователя
        db.get(`
            SELECT 
                COUNT(*) as total_forecasts_viewed,
                SUM(v.points_earned) as total_points_earned
            FROM views v
            WHERE v.user_id = ?
        `, [user.id], (err, stats) => {
            if (!err && stats) {
                user.stats = stats;
            }
            
            res.json(user);
        });
    });
});

// Обновить профиль пользователя
router.put('/user/:telegram_id', (req, res) => {
    const telegramId = req.params.telegram_id;
    const { username, email } = req.body;
    
    db.run(
        'UPDATE users SET username = ?, email = ? WHERE telegram_id = ?',
        [username, email, telegramId],
        function(err) {
            if (err) {
                console.error('Ошибка обновления пользователя:', err);
                return res.status(500).json({ error: 'Ошибка обновления' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            res.json({ success: true, message: 'Профиль обновлен' });
        }
    );
});

// Начислить ежедневный бонус
router.post('/user/:telegram_id/daily-bonus', (req, res) => {
    const telegramId = req.params.telegram_id;
    const now = new Date().toISOString().split('T')[0];
    
    db.get('SELECT id, last_daily, daily_streak FROM users WHERE telegram_id = ?', [telegramId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        let bonus = 5;
        let streak = user.daily_streak || 0;
        let message = 'Ежедневный бонус получен!';
        
        // Проверяем, получал ли уже сегодня
        if (user.last_daily === now) {
            return res.json({ 
                success: false, 
                message: 'Вы уже получили бонус сегодня', 
                next_bonus: 'завтра' 
            });
        }
        
        // Проверяем серию
        const lastDaily = user.last_daily ? new Date(user.last_daily) : null;
        const today = new Date(now);
        
        if (lastDaily) {
            const diffDays = Math.floor((today - lastDaily) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak += 1;
                
                // Бонус за серию
                if (streak % 7 === 0) {
                    bonus += 20;
                    message += ` 🎉 Недельная серия! +20 бонусных баллов`;
                } else if (streak % 30 === 0) {
                    bonus += 50;
                    message += ` 🏆 Месячная серия! +50 бонусных баллов`;
                }
            } else if (diffDays > 1) {
                streak = 1;
                message = 'Новая серия начата!';
            }
        } else {
            streak = 1;
        }
        
        // Начисляем бонус
        db.serialize(() => {
            db.run(
                'UPDATE users SET balance = balance + ?, daily_streak = ?, last_daily = ? WHERE telegram_id = ?',
                [bonus, streak, now, telegramId]
            );
            
            // Записываем транзакцию
            db.run(
                'INSERT INTO transactions (user_id, type, amount, description) VALUES ((SELECT id FROM users WHERE telegram_id = ?), ?, ?, ?)',
                [telegramId, 'daily', bonus, 'Ежедневный бонус']
            );
            
            res.json({
                success: true,
                bonus: bonus,
                streak: streak,
                message: message,
                total_streak: streak
            });
        });
    });
});

// ==================== ПРОГНОЗЫ ====================

// Получить прогнозы с фильтрацией
router.get('/forecasts', (req, res) => {
    const { 
        sport, 
        is_vip, 
        is_premium, 
        league, 
        limit = 20, 
        offset = 0,
        user_id 
    } = req.query;
    
    let query = `
        SELECT 
            f.*,
            l.name as league_name,
            l.country as league_country,
            COUNT(v.id) as total_views,
            AVG(f.confidence) as avg_confidence
        FROM forecasts f
        LEFT JOIN views v ON v.forecast_id = f.id
        LEFT JOIN leagues l ON l.name = f.league
        WHERE 1=1
    `;
    
    const params = [];
    
    if (sport && sport !== 'all') {
        query += ' AND f.sport = ?';
        params.push(sport);
    }
    
    if (is_vip === 'true') {
        query += ' AND f.is_vip = 1';
    } else if (is_vip === 'false') {
        query += ' AND f.is_vip = 0';
    }
    
    if (is_premium === 'true') {
        query += ' AND f.is_premium = 1';
    }
    
    if (league && league !== 'all') {
        query += ' AND f.league = ?';
        params.push(league);
    }
    
    query += ' GROUP BY f.id ORDER BY f.match_time DESC, f.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, forecasts) => {
        if (err) {
            console.error('Ошибка получения прогнозов:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        // Если передан user_id, добавляем информацию о просмотрах
        if (user_id) {
            db.all(
                `SELECT forecast_id FROM views WHERE user_id IN (SELECT id FROM users WHERE telegram_id = ?)`,
                [user_id],
                (err, userViews) => {
                    if (err) {
                        return res.json(forecasts);
                    }
                    
                    const viewedIds = userViews.map(v => v.forecast_id);
                    const enhancedForecasts = forecasts.map(forecast => ({
                        ...forecast,
                        viewed: viewedIds.includes(forecast.id),
                        is_favorite: false // Можно добавить проверку избранного
                    }));
                    
                    res.json(enhancedForecasts);
                }
            );
        } else {
            res.json(forecasts);
        }
    });
});

// Получить конкретный прогноз
router.get('/forecasts/:id', (req, res) => {
    const forecastId = req.params.id;
    
    db.get(`
        SELECT 
            f.*,
            l.name as league_name,
            l.logo_url as league_logo,
            COUNT(v.id) as total_views
        FROM forecasts f
        LEFT JOIN views v ON v.forecast_id = f.id
        LEFT JOIN leagues l ON l.name = f.league
        WHERE f.id = ?
        GROUP BY f.id
    `, [forecastId], (err, forecast) => {
        if (err) {
            console.error('Ошибка получения прогноза:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        if (!forecast) {
            return res.status(404).json({ error: 'Прогноз не найден' });
        }
        
        res.json(forecast);
    });
});

// Отметить прогноз как просмотренный
router.post('/forecasts/:id/view', (req, res) => {
    const forecastId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'Требуется user_id' });
    }
    
    // Начинаем транзакцию
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Проверяем, не смотрел ли уже
        db.get(
            `SELECT v.id FROM views v 
             JOIN users u ON u.id = v.user_id 
             WHERE u.telegram_id = ? AND v.forecast_id = ?`,
            [user_id, forecastId],
            (err, existingView) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Ошибка проверки просмотра' });
                }
                
                if (existingView) {
                    db.run('ROLLBACK');
                    return res.json({ success: false, message: 'Прогноз уже просмотрен' });
                }
                
                // Получаем ID пользователя
                db.get('SELECT id, balance FROM users WHERE telegram_id = ?', [user_id], (err, user) => {
                    if (err || !user) {
                        db.run('ROLLBACK');
                        return res.status(404).json({ error: 'Пользователь не найден' });
                    }
                    
                    const pointsEarned = 2; // Баллы за просмотр
                    
                    // Добавляем просмотр
                    db.run(
                        'INSERT INTO views (user_id, forecast_id, points_earned) VALUES (?, ?, ?)',
                        [user.id, forecastId, pointsEarned],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Ошибка добавления просмотра' });
                            }
                            
                            // Обновляем баланс пользователя
                            db.run(
                                'UPDATE users SET balance = balance + ?, total_points = total_points + ? WHERE id = ?',
                                [pointsEarned, pointsEarned, user.id]
                            );
                            
                            // Обновляем счетчик просмотров прогноза
                            db.run(
                                'UPDATE forecasts SET views_count = views_count + 1 WHERE id = ?',
                                [forecastId]
                            );
                            
                            // Записываем транзакцию
                            db.run(
                                'INSERT INTO transactions (user_id, type, amount, description, forecast_id) VALUES (?, ?, ?, ?, ?)',
                                [user.id, 'view', pointsEarned, 'Просмотр прогноза', forecastId]
                            );
                            
                            db.run('COMMIT');
                            
                            // Получаем обновленный баланс
                            db.get('SELECT balance FROM users WHERE id = ?', [user.id], (err, updatedUser) => {
                                res.json({
                                    success: true,
                                    message: `+${pointsEarned} балла за просмотр`,
                                    points_earned: pointsEarned,
                                    new_balance: updatedUser ? updatedUser.balance : user.balance + pointsEarned,
                                    view_id: this.lastID
                                });
                            });
                        }
                    );
                });
            }
        );
    });
});

// Добавить в избранное
router.post('/forecasts/:id/favorite', (req, res) => {
    const forecastId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'Требуется user_id' });
    }
    
    db.get('SELECT id FROM users WHERE telegram_id = ?', [user_id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        db.run(
            'INSERT OR IGNORE INTO favorites (user_id, forecast_id) VALUES (?, ?)',
            [user.id, forecastId],
            function(err) {
                if (err) {
                    console.error('Ошибка добавления в избранное:', err);
                    return res.status(500).json({ error: 'Ошибка сервера' });
                }
                
                if (this.changes === 0) {
                    return res.json({ success: false, message: 'Уже в избранном' });
                }
                
                res.json({ success: true, message: 'Добавлено в избранное' });
            }
        );
    });
});

// Удалить из избранного
router.delete('/forecasts/:id/favorite', (req, res) => {
    const forecastId = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'Требуется user_id' });
    }
    
    db.get('SELECT id FROM users WHERE telegram_id = ?', [user_id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        db.run(
            'DELETE FROM favorites WHERE user_id = ? AND forecast_id = ?',
            [user.id, forecastId],
            function(err) {
                if (err) {
                    console.error('Ошибка удаления из избранного:', err);
                    return res.status(500).json({ error: 'Ошибка сервера' });
                }
                
                res.json({ success: true, message: 'Удалено из избранного' });
            }
        );
    });
});

// ==================== АДМИН API ====================

// Добавить новый прогноз
router.post('/admin/forecasts', checkAdmin, (req, res) => {
    const {
        sport,
        league,
        match,
        prediction,
        coefficient,
        confidence,
        comment,
        is_vip = false,
        is_premium = false,
        match_time
    } = req.body;
    
    // Валидация
    if (!sport || !match || !prediction || !coefficient) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
    }
    
    if (coefficient < 1.01) {
        return res.status(400).json({ error: 'Коэффициент должен быть больше 1.00' });
    }
    
    if (confidence && (confidence < 1 || confidence > 10)) {
        return res.status(400).json({ error: 'Уверенность должна быть от 1 до 10' });
    }
    
    db.run(
        `INSERT INTO forecasts (
            sport, league, match, prediction, coefficient, confidence, comment, 
            is_vip, is_premium, match_time, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            sport, league, match, prediction, coefficient, confidence || 7, comment,
            is_vip ? 1 : 0, is_premium ? 1 : 0, match_time || new Date().toISOString(),
            req.admin.id
        ],
        function(err) {
            if (err) {
                console.error('Ошибка добавления прогноза:', err);
                return res.status(500).json({ error: 'Ошибка добавления прогноза' });
            }
            
            res.json({
                success: true,
                message: 'Прогноз успешно добавлен',
                forecast_id: this.lastID
            });
        }
    );
});

// Обновить прогноз
router.put('/admin/forecasts/:id', checkAdmin, (req, res) => {
    const forecastId = req.params.id;
    const updates = req.body;
    
    const allowedFields = ['sport', 'league', 'match', 'prediction', 'coefficient', 
                          'confidence', 'comment', 'result', 'is_vip', 'is_premium', 'match_time'];
    
    const setClause = [];
    const values = [];
    
    allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
            setClause.push(`${field} = ?`);
            values.push(updates[field]);
        }
    });
    
    if (setClause.length === 0) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(forecastId);
    
    db.run(
        `UPDATE forecasts SET ${setClause.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Ошибка обновления прогноза:', err);
                return res.status(500).json({ error: 'Ошибка обновления' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Прогноз не найден' });
            }
            
            res.json({ success: true, message: 'Прогноз обновлен' });
        }
    );
});

// Удалить прогноз
router.delete('/admin/forecasts/:id', checkAdmin, (req, res) => {
    const forecastId = req.params.id;
    
    db.run('DELETE FROM forecasts WHERE id = ?', [forecastId], function(err) {
        if (err) {
            console.error('Ошибка удаления прогноза:', err);
            return res.status(500).json({ error: 'Ошибка удаления' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Прогноз не найден' });
        }
        
        // Удаляем связанные данные
        db.run('DELETE FROM views WHERE forecast_id = ?', [forecastId]);
        db.run('DELETE FROM favorites WHERE forecast_id = ?', [forecastId]);
        
        res.json({ success: true, message: 'Прогноз удален' });
    });
});

// Статистика админки
router.get('/admin/stats', checkAdmin, (req, res) => {
    const stats = {};
    
    db.serialize(() => {
        // Основная статистика
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (!err) stats.total_users = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE("now")', (err, row) => {
            if (!err) stats.new_users_today = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM forecasts', (err, row) => {
            if (!err) stats.total_forecasts = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM forecasts WHERE is_vip = 1', (err, row) => {
            if (!err) stats.vip_forecasts = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM forecasts WHERE result = "win"', (err, row) => {
            if (!err) stats.winning_forecasts = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM forecasts WHERE result = "loss"', (err, row) => {
            if (!err) stats.losing_forecasts = row.count;
        });
        
        db.get('SELECT SUM(balance) as total FROM users', (err, row) => {
            if (!err) stats.total_balance = row.total || 0;
        });
        
        db.get('SELECT COUNT(*) as count FROM views', (err, row) => {
            if (!err) stats.total_views = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM transactions WHERE type = "view" AND DATE(created_at) = DATE("now")', (err, row) => {
            if (!err) stats.views_today = row.count;
        });
        
        // Статистика по дням (последние 7 дней)
        db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_users
            FROM users 
            WHERE created_at >= DATE('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        `, (err, rows) => {
            if (!err) stats.users_last_7_days = rows;
        });
        
        // Популярные прогнозы
        db.all(`
            SELECT 
                f.id,
                f.match,
                f.sport,
                COUNT(v.id) as views
            FROM forecasts f
            LEFT JOIN views v ON v.forecast_id = f.id
            GROUP BY f.id
            ORDER BY views DESC
            LIMIT 10
        `, (err, rows) => {
            if (!err) stats.top_forecasts = rows;
        });
        
        // Ждем завершения всех запросов
        setTimeout(() => {
            res.json(stats);
        }, 200);
    });
});

// Управление пользователями (админ)
router.get('/admin/users', checkAdmin, (req, res) => {
    const { limit = 50, offset = 0, search = '' } = req.query;
    
    let query = `
        SELECT 
            u.*,
            COUNT(DISTINCT v.id) as total_views,
            COUNT(DISTINCT f.id) as total_favorites,
            (SELECT SUM(amount) FROM transactions t WHERE t.user_id = u.id AND t.type = 'view') as total_points_earned
        FROM users u
        LEFT JOIN views v ON v.user_id = u.id
        LEFT JOIN favorites f ON f.user_id = u.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
        query += ' AND (u.username LIKE ? OR u.telegram_id LIKE ? OR u.email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, users) => {
        if (err) {
            console.error('Ошибка получения пользователей:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        res.json(users);
    });
});

// Начислить/списать баллы пользователю
router.post('/admin/users/:id/balance', checkAdmin, (req, res) => {
    const userId = req.params.id;
    const { amount, description, type = 'manual' } = req.body;
    
    if (!amount || !description) {
        return res.status(400).json({ error: 'Укажите amount и description' });
    }
    
    db.serialize(() => {
        // Обновляем баланс
        db.run(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            [amount, userId],
            function(err) {
                if (err) {
                    console.error('Ошибка обновления баланса:', err);
                    return res.status(500).json({ error: 'Ошибка обновления баланса' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Пользователь не найден' });
                }
                
                // Записываем транзакцию
                db.run(
                    'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                    [userId, type, amount, description]
                );
                
                // Получаем обновленный баланс
                db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
                    res.json({
                        success: true,
                        message: `Баланс обновлен на ${amount > 0 ? '+' : ''}${amount} баллов`,
                        new_balance: user ? user.balance : 0
                    });
                });
            }
        );
    });
});

// ==================== СИСТЕМА ПРИГЛАШЕНИЙ ====================

// Создать реферальный код
router.post('/user/:telegram_id/referral', (req, res) => {
    const telegramId = req.params.telegram_id;
    
    // Генерируем уникальный реферальный код
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    db.get('SELECT id FROM users WHERE telegram_id = ?', [telegramId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        db.run(
            'UPDATE users SET referral_code = ? WHERE id = ?',
            [referralCode, user.id],
            function(err) {
                if (err) {
                    console.error('Ошибка создания реферального кода:', err);
                    return res.status(500).json({ error: 'Ошибка создания кода' });
                }
                
                res.json({
                    success: true,
                    referral_code: referralCode,
                    referral_link: `https://t.me/ensd_sport_bot?start=ref_${referralCode}`
                });
            }
        );
    });
});

// Регистрация по реферальной ссылке
router.post('/user/register/referral', (req, res) => {
    const { telegram_id, username, referral_code } = req.body;
    
    if (!telegram_id || !referral_code) {
        return res.status(400).json({ error: 'Требуется telegram_id и referral_code' });
    }
    
    db.serialize(() => {
        // Находим реферера
        db.get('SELECT id FROM users WHERE referral_code = ?', [referral_code], (err, referrer) => {
            if (err || !referrer) {
                return res.status(404).json({ error: 'Неверный реферальный код' });
            }
            
            // Регистрируем нового пользователя
            db.run(
                `INSERT INTO users (telegram_id, username, referred_by) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(telegram_id) DO UPDATE SET username = ?`,
                [telegram_id, username, referrer.id, username],
                function(err) {
                    if (err) {
                        console.error('Ошибка регистрации:', err);
                        return res.status(500).json({ error: 'Ошибка регистрации' });
                    }
                    
                    const newUserId = this.lastID;
                    
                    // Начисляем бонус рефереру (30 баллов)
                    db.run(
                        'UPDATE users SET balance = balance + 30 WHERE id = ?',
                        [referrer.id]
                    );
                    
                    // Записываем транзакцию рефереру
                    db.run(
                        'INSERT INTO transactions (user_id, type, amount, description, referral_id) VALUES (?, ?, ?, ?, ?)',
                        [referrer.id, 'referral', 30, 'Приглашение друга', newUserId]
                    );
                    
                    // Начисляем бонус новому пользователю (10 баллов)
                    db.run(
                        'UPDATE users SET balance = balance + 10 WHERE id = ?',
                        [newUserId]
                    );
                    
                    db.run(
                        'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                        [newUserId, 'bonus', 10, 'Бонус за регистрацию по реферальной ссылке']
                    );
                    
                    res.json({
                        success: true,
                        message: 'Регистрация успешна! Получено 10 бонусных баллов',
                        bonus: 10,
                        referrer_bonus: 30
                    });
                }
            );
        });
    });
});

// ==================== VIP СИСТЕМА ====================

// Активировать VIP подписку
router.post('/vip/activate', (req, res) => {
    const { telegram_id, plan = 'monthly' } = req.body;
    
    if (!telegram_id) {
        return res.status(400).json({ error: 'Требуется telegram_id' });
    }
    
    const plans = {
        'weekly': { days: 7, price: 100 },
        'monthly': { days: 30, price: 300 },
        'yearly': { days: 365, price: 2500 }
    };
    
    const selectedPlan = plans[plan];
    if (!selectedPlan) {
        return res.status(400).json({ error: 'Неверный план подписки' });
    }
    
    db.get('SELECT id, balance FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверяем баланс
        if (user.balance < selectedPlan.price) {
            return res.status(400).json({ 
                error: 'Недостаточно баллов', 
                required: selectedPlan.price, 
                current: user.balance 
            });
        }
        
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + selectedPlan.days * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        
        db.serialize(() => {
            // Списываем баллы
            db.run(
                'UPDATE users SET balance = balance - ? WHERE id = ?',
                [selectedPlan.price, user.id]
            );
            
            // Записываем транзакцию
            db.run(
                'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [user.id, 'purchase', -selectedPlan.price, `VIP подписка (${plan})`]
            );
            
            // Активируем VIP подписку
            db.run(
                `INSERT INTO vip_subscriptions (user_id, plan, start_date, end_date) 
                 VALUES (?, ?, ?, ?)`,
                [user.id, plan, startDate, endDate]
            );
            
            // Обновляем дату окончания VIP в таблице users
            db.run(
                'UPDATE users SET vip_expiry = ? WHERE id = ?',
                [endDate, user.id]
            );
            
            res.json({
                success: true,
                message: `VIP подписка активирована на ${selectedPlan.days} дней`,
                plan: plan,
                price: selectedPlan.price,
                end_date: endDate,
                new_balance: user.balance - selectedPlan.price
            });
        });
    });
});

// Проверить VIP статус
router.get('/vip/status/:telegram_id', (req, res) => {
    const telegramId = req.params.telegram_id;
    
    db.get(`
        SELECT 
            u.vip_expiry,
            vs.plan,
            vs.start_date,
            vs.end_date,
            vs.is_active,
            CASE 
                WHEN vs.end_date >= DATE('now') THEN 1
                ELSE 0
            END as has_active_vip
        FROM users u
        LEFT JOIN vip_subscriptions vs ON vs.user_id = u.id AND vs.is_active = 1
        WHERE u.telegram_id = ?
        ORDER BY vs.end_date DESC
        LIMIT 1
    `, [telegramId], (err, result) => {
        if (err) {
            console.error('Ошибка проверки VIP статуса:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        if (!result) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const isVipActive = result.has_active_vip === 1;
        
        res.json({
            is_vip: isVipActive,
            plan: result.plan,
            start_date: result.start_date,
            end_date: result.end_date,
            days_remaining: isVipActive 
                ? Math.ceil((new Date(result.end_date) - new Date()) / (1000 * 60 * 60 * 24))
                : 0
        });
    });
});

// ==================== ПОИСК И ФИЛЬТРЫ ====================

// Поиск прогнозов
router.get('/search/forecasts', (req, res) => {
    const { q, sport, league, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Введите минимум 2 символа для поиска' });
    }
    
    let query = `
        SELECT 
            f.*,
            l.name as league_name
        FROM forecasts f
        LEFT JOIN leagues l ON l.name = f.league
        WHERE (f.match LIKE ? OR f.league LIKE ? OR f.comment LIKE ?)
    `;
    
    const params = [`%${q}%`, `%${q}%`, `%${q}%`];
    
    if (sport && sport !== 'all') {
        query += ' AND f.sport = ?';
        params.push(sport);
    }
    
    if (league && league !== 'all') {
        query += ' AND f.league = ?';
        params.push(league);
    }
    
    query += ' ORDER BY f.match_time DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, results) => {
        if (err) {
            console.error('Ошибка поиска:', err);
            return res.status(500).json({ error: 'Ошибка поиска' });
        }
        
        res.json({
            query: q,
            count: results.length,
            results: results
        });
    });
});

// Получить список лиг
router.get('/leagues', (req, res) => {
    const { sport } = req.query;
    
    let query = 'SELECT * FROM leagues WHERE is_active = 1';
    const params = [];
    
    if (sport) {
        query += ' AND sport = ?';
        params.push(sport);
    }
    
    query += ' ORDER BY sport, country, name';
    
    db.all(query, params, (err, leagues) => {
        if (err) {
            console.error('Ошибка получения лиг:', err);
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        res.json(leagues);
    });
});

// ==================== ЗАГРУЗКИ И ЭКСПОРТ ====================

// Экспорт прогнозов (JSON)
router.get('/export/forecasts', checkAdmin, (req, res) => {
    const { format = 'json', sport, start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM forecasts WHERE 1=1';
    const params = [];
    
    if (sport && sport !== 'all') {
        query += ' AND sport = ?';
        params.push(sport);
    }
    
    if (start_date) {
        query += ' AND DATE(created_at) >= ?';
        params.push(start_date);
    }
    
    if (end_date) {
        query += ' AND DATE(created_at) <= ?';
        params.push(end_date);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, params, (err, forecasts) => {
        if (err) {
            console.error('Ошибка экспорта:', err);
            return res.status(500).json({ error: 'Ошибка экспорта' });
        }
        
        if (format === 'csv') {
            // Конвертируем в CSV
            const csv = convertToCSV(forecasts);
            res.header('Content-Type', 'text/csv');
            res.header('Content-Disposition', 'attachment; filename=forecasts_export.csv');
            return res.send(csv);
        }
        
        // По умолчанию JSON
        res.json({
            count: forecasts.length,
            exported_at: new Date().toISOString(),
            data: forecasts
        });
    });
});

// Вспомогательная функция для конвертации в CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// ==================== СИСТЕМНЫЕ ФУНКЦИИ ====================

// Health check
router.get('/health', (req, res) => {
    db.get('SELECT 1 as status', (err, row) => {
        const dbStatus = !err && row ? 'healthy' : 'unhealthy';
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    });
});

// Получить системную информацию
router.get('/system/info', checkAdmin, (req, res) => {
    const info = {
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database_size: 0
    };
    
    // Получаем размер базы данных
    db.get("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()", (err, row) => {
        if (!err && row) {
            info.database_size = Math.round(row.size / 1024 / 1024 * 100) / 100; // в MB
        }
        
        res.json(info);
    });
});

// Очистить кэш (админ)
router.post('/system/clear-cache', checkAdmin, (req, res) => {
    // Здесь можно добавить логику очистки кэша
    res.json({ 
        success: true, 
        message: 'Кэш очищен',
        cleared_at: new Date().toISOString()
    });
});

// ==================== ОШИБКИ И ЛОГИРОВАНИЕ ====================

// Глобальный обработчик ошибок
router.use((err, req, res, next) => {
    console.error('API Error:', err);
    
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Внутренняя ошибка сервера',
            code: err.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        }
    });
});

// 404 обработчик
router.use('*', (req, res) => {
    res.status(404).json({
        error: {
            message: 'Ресурс не найден',
            code: 'NOT_FOUND',
            path: req.originalUrl
        }
    });
});

module.exports = router;