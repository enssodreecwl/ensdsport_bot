from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor
from aiohttp import web
from jinja2 import Environment, FileSystemLoader
import database as db

BOT_TOKEN = "8393932502:AAEbOijTuevnjVkhxhtDFUgxNWapBsg3DB4"  # <- вставь сюда токен бота

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)

# Проверка, админ ли
def is_admin(user_id):
    result = db.cur.execute("SELECT id FROM admins WHERE telegram_id=?", (user_id,)).fetchone()
    return result is not None

# /start
@dp.message_handler(commands=['start'])
async def start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username

    db.cur.execute("INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?,?)", (user_id, username))
    db.conn.commit()

    keyboard = types.InlineKeyboardMarkup()
    keyboard.add(types.InlineKeyboardButton("▶️ Смотреть прогнозы", web_app=types.WebAppInfo(url=f"http://{message.bot.username}.repl.co/")))
    if is_admin(user_id):
        keyboard.add(types.InlineKeyboardButton("🛠 Админ-панель", web_app=types.WebAppInfo(url=f"http://{message.bot.username}.repl.co/admin")))

    await message.answer("👋 Добро пожаловать в ENSD SPORT!", reply_markup=keyboard)

# Mini App
env = Environment(loader=FileSystemLoader('templates'))

async def handle_root(request):
    template = env.get_template("index.html")
    return web.Response(text=template.render(), content_type='text/html')

app = web.Application()
app.router.add_get('/', handle_root)

# Запуск
if name == "__main__":
    import asyncio
    loop = asyncio.get_event_loop()
    loop.create_task(executor.start_polling(dp, skip_updates=True))
    web.run_app(app, port=3000)
