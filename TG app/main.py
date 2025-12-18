import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiohttp import web
import aiohttp
import sqlite3
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = os.getenv("BOT_TOKEN", "8393932502:AAEbOijTuevnjVkhxhtDFUgxNWapBsg3DB4")
ADMIN_IDS = list(map(int, os.getenv("ADMIN_IDS", "123456789").split(",")))
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:3000")
DB_PATH = os.getenv("DB_PATH", "data/database.db")

# Инициализация бота
bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# Инициализация базы данных
def init_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Таблица пользователей
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        username TEXT,
        balance INTEGER DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
        last_daily DATE,
        vip_expiry DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Таблица прогнозов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sport TEXT,
        league TEXT,
        match TEXT,
        prediction TEXT,
        coefficient REAL,
        confidence INTEGER,
        comment TEXT,
        is_vip BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        match_time TIMESTAMP
    )
    ''')
    
    # Таблица просмотров
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        forecast_id INTEGER,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (forecast_id) REFERENCES forecasts (id)
    )
    ''')
    
    # Таблица админов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE
    )
    ''')
    
    # Добавляем админов если их нет
    for admin_id in ADMIN_IDS:
        cursor.execute("INSERT OR IGNORE INTO admins (telegram_id) VALUES (?)", (admin_id,))
    
    conn.commit()
    conn.close()

# Проверка админа
def is_admin(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM admins WHERE telegram_id=?", (telegram_id,))
    result = cursor.fetchone()
    conn.close()
    return result is not None

# Добавление/обновление пользователя
def add_user(telegram_id, username):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)",
        (telegram_id, username)
    )
    cursor.execute(
        "UPDATE users SET username = ? WHERE telegram_id = ?",
        (username, telegram_id)
    )
    conn.commit()
    conn.close()

# Начисление ежедневного бонуса
def add_daily_bonus(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Получаем информацию о пользователе
    cursor.execute("SELECT last_daily, daily_streak FROM users WHERE telegram_id=?", (telegram_id,))
    user = cursor.fetchone()
    
    today = datetime.now().date()
    bonus = 5
    streak_message = ""
    
    if user and user[0]:
        last_daily = datetime.strptime(user[0], "%Y-%m-%d").date()
        streak = user[1] or 0
        
        if last_daily == today:
            return 0, "Вы уже получили ежедневный бонус сегодня"
          if last_daily == today - timedelta(days=1):
            streak += 1
            if streak % 7 == 0:
                bonus += 20  # Бонус за неделю
                streak_message = f"🎉 Недельная серия! +20 бонусных баллов"
        else:
            streak = 1
            streak_message = "Начата новая серия"
    else:
        streak = 1
        streak_message = "Добро пожаловать! Начата новая серия"
    
    # Обновляем баланс и информацию
    cursor.execute(
        "UPDATE users SET balance = balance + ?, daily_streak = ?, last_daily = ? WHERE telegram_id = ?",
        (bonus, streak, today, telegram_id)
    )
    
    conn.commit()
    conn.close()
    return bonus, streak_message

# Команда /start
@dp.message(Command("start"))
async def start_command(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username or ""
    
    # Добавляем пользователя
    add_user(user_id, username)
    
    # Начисляем ежедневный бонус
    bonus, streak_msg = add_daily_bonus(user_id)
    
    # Создаем клавиатуру
    keyboard = types.InlineKeyboardMarkup(row_width=1)
    
    # Кнопка для открытия Mini App
    web_app_url = f"{SERVER_URL}?user_id={user_id}"
    keyboard.add(
        types.InlineKeyboardButton(
            text="▶️ Смотреть прогнозы",
            web_app=types.WebAppInfo(url=web_app_url)
        )
    )
    
    # Кнопка админ-панели для админов
    if is_admin(user_id):
        admin_url = f"{SERVER_URL}/admin?user_id={user_id}"
        keyboard.add(
            types.InlineKeyboardButton(
                text="🛠 Админ-панель",
                web_app=types.WebAppInfo(url=admin_url)
            )
        )
    
    welcome_text = f"""
👋 Добро пожаловать в <b>ENSD SPORT</b>!

🏆 <b>Здесь ты найдёшь:</b>
⚽️ Бесплатные прогнозы на спорт
🏒 Подробную аналитику
⭐️ Систему баллов и достижений
🤖 ИИ-инструменты (скоро)

💰 <b>Ваш баланс:</b> 0 баллов
"""
    
    if bonus > 0:
        welcome_text += f"\n🎁 <b>Ежедневный бонус:</b> +{bonus} баллов"
        if streak_msg:
            welcome_text += f"\n{streak_msg}"
    
    await message.answer(welcome_text, reply_markup=keyboard)

# Команда /balance
@dp.message(Command("balance"))
async def balance_command(message: types.Message):
    user_id = message.from_user.id
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT balance FROM users WHERE telegram_id=?", (user_id,))
    result = cursor.fetchone()
    balance = result[0] if result else 0
    
    conn.close()
    
    await message.answer(f"💰 <b>Ваш баланс:</b> {balance} баллов")

# Команда /admin для проверки прав
@dp.message(Command("admin"))
async def admin_command(message: types.Message):
    user_id = message.from_user.id
    
    if is_admin(user_id):
        admin_url = f"{SERVER_URL}/admin?user_id={user_id}"
        
        keyboard = types.InlineKeyboardMarkup()
        keyboard.add(
            types.InlineKeyboardButton(
                text="📊 Открыть админ-панель",
                web_app=types.WebAppInfo(url=admin_url)
            )
        )
        
        await message.answer("👑 <b>Доступ к админ-панели разрешен</b>", reply_markup=keyboard)
    else:
        await message.answer("⛔️ <b>У вас нет прав администратора</b>")

# Запуск бота
async def main():
    # Инициализируем базу данных
    init_db()
    
    logger.info("🚀 Запуск ENSD SPORT бота...")
    logger.info(f"🤖 ID бота: {BOT_TOKEN[:10]}...")
    logger.info(f"👑 Админы: {ADMIN_IDS}")
    
    # Запускаем polling
    await dp.start_polling(bot)

if name == "__main__":
    asyncio.run(main())
