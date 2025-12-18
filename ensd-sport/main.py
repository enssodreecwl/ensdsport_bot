import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor
from aiohttp import web
from jinja2 import Environment, FileSystemLoader
import database as db

# ================= ENV =================
BOT_TOKEN = os.getenv("BOT_TOKEN")
BASE_URL = os.getenv("BASE_URL", "")
PORT = int(os.getenv("PORT", 10000))

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set")

# ================= BOT =================
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)

def is_admin(user_id: int) -> bool:
    result = db.cur.execute(
        "SELECT id FROM admins WHERE telegram_id=?",
        (user_id,)
    ).fetchone()
    return result is not None

@dp.message_handler(commands=["start"])
async def start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username

    db.cur.execute(
        "INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?,?)",
        (user_id, username)
    )
    db.conn.commit()

    keyboard = types.InlineKeyboardMarkup()
    keyboard.add(
        types.InlineKeyboardButton(
            "▶️ Смотреть прогнозы",
            web_app=types.WebAppInfo(url=f"{BASE_URL}/")
        )
    )

    if is_admin(user_id):
        keyboard.add(
            types.InlineKeyboardButton(
                "🛠 Админ-панель",
                web_app=types.WebAppInfo(url=f"{BASE_URL}/admin")
            )
        )

    await message.answer(
        "👋 Добро пожаловать в ENSD SPORT!",
        reply_markup=keyboard
    )

# ================= WEB (Mini App) =================
env = Environment(loader=FileSystemLoader("templates"))

async def handle_root(request):
    template = env.get_template("index.html")
    return web.Response(
        text=template.render(),
        content_type="text/html"
    )

app = web.Application()
app.router.add_get("/", handle_root)

# ================= START =================
async def main():
    loop = asyncio.get_event_loop()

    # Telegram bot (polling)
    loop.create_task(
        executor.start_polling(dp, skip_updates=True)
    )

    # Web server (Render ждёт порт)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()

    # держим процесс живым
    while True:
        await asyncio.sleep(3600)

if name == "__main__":
    asyncio.run(main())
