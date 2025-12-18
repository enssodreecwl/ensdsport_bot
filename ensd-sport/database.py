import sqlite3

conn = sqlite3.connect("ensd_sport.db", check_same_thread=False)
cur = conn.cursor()

# Пользователи
cur.execute("""
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    points INTEGER DEFAULT 0
)
""")

# Прогнозы
cur.execute("""
CREATE TABLE IF NOT EXISTS forecasts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sport TEXT,
    league TEXT,
    match TEXT,
    prediction TEXT,
    coefficient REAL,
    confidence INTEGER,
    comment TEXT
)
""")

# Админы
cur.execute("""
CREATE TABLE IF NOT EXISTS admins(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE
)
""")

conn.commit()