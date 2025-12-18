import sqlite3
from datetime import datetime
import json
import os

DB_PATH = "data/database.db"

def get_connection():
    """Получить соединение с базой данных"""
    os.makedirs("data", exist_ok=True)
    return sqlite3.connect(DB_PATH)

# Функции для работы с пользователями
def get_user_by_telegram_id(telegram_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE telegram_id=?", (telegram_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def update_user_balance(telegram_id, amount):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET balance = balance + ? WHERE telegram_id = ?",
        (amount, telegram_id)
    )
    conn.commit()
    conn.close()

# Функции для работы с прогнозами
def get_forecasts(sport=None, is_vip=False, limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM forecasts WHERE 1=1"
    params = []
    
    if sport:
        query += " AND sport = ?"
        params.append(sport)
    
    if is_vip is not None:
        query += " AND is_vip = ?"
        params.append(1 if is_vip else 0)
    
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    forecasts = cursor.fetchall()
    
    # Конвертируем в словари
    columns = [description[0] for description in cursor.description]
    result = []
    for row in forecasts:
        result.append(dict(zip(columns, row)))
    
    conn.close()
    return result

def add_forecast(sport, league, match, prediction, coefficient, confidence, comment, is_vip=False):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO forecasts (sport, league, match, prediction, coefficient, confidence, comment, is_vip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (sport, league, match, prediction, coefficient, confidence, comment, 1 if is_vip else 0))
    
    forecast_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return forecast_id

def delete_forecast(forecast_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM forecasts WHERE id=?", (forecast_id,))
    conn.commit()
    conn.close()

# Функции для работы с просмотрами
def add_view(user_id, forecast_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Проверяем, не смотрел ли уже
    cursor.execute(
        "SELECT id FROM views WHERE user_id=? AND forecast_id=?",
        (user_id, forecast_id)
    )
    if cursor.fetchone():
        conn.close()
        return False
    
    # Добавляем просмотр
    cursor.execute(
        "INSERT INTO views (user_id, forecast_id) VALUES (?, ?)",
        (user_id, forecast_id)
    )
    
    # Начисляем баллы
    cursor.execute(
        "UPDATE users SET balance = balance + 2 WHERE id=?",
        (user_id,)
    )
    
    conn.commit()
    conn.close()
    return True

# Функции для админки
def get_admin_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    stats = {}
    
    # Общее количество пользователей
    cursor.execute("SELECT COUNT(*) FROM users")
    stats['total_users'] = cursor.fetchone()[0]
    
    # Новые пользователи за сегодня
    cursor.execute("SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE('now')")
    stats['new_users_today'] = cursor.fetchone()[0]
    
    # Всего прогнозов
    cursor.execute("SELECT COUNT(*) FROM forecasts")
    stats['total_forecasts'] = cursor.fetchone()[0]
    
    # VIP прогнозы
    cursor.execute("SELECT COUNT(*) FROM forecasts WHERE is_vip = 1")
    stats['vip_forecasts'] = cursor.fetchone()[0]
    
    # Общее количество баллов в системе
    cursor.execute("SELECT SUM(balance) FROM users")
    stats['total_balance'] = cursor.fetchone()[0] or 0
    
    conn.close()
    return stats