import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { SPORT_TYPES, type SportType } from "@shared/schema";

const token = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(",") || [];
const WEBAPP_URL = process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : "https://localhost:5000";

let bot: TelegramBot | null = null;

export function initTelegramBot() {
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, bot will not start");
    return null;
  }

  bot = new TelegramBot(token, { polling: true });

  // Start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();
    const username = msg.from?.username;
    const firstName = msg.from?.first_name;
    const lastName = msg.from?.last_name;

    if (userId) {
      try {
        let user = await storage.getUserByTelegramId(userId);
        if (!user) {
          const isAdmin = ADMIN_TELEGRAM_IDS.includes(userId);
          user = await storage.createUser({
            telegramId: userId,
            username,
            firstName,
            lastName,
            isAdmin,
          });
        } else {
          // Update existing user info
          await storage.updateUser(user.id, { username, firstName, lastName });
        }
      } catch (error) {
        console.error("Error creating/updating user:", error);
      }
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: "Открыть приложение", web_app: { url: WEBAPP_URL } }],
      ],
    };

    await bot?.sendMessage(
      chatId,
      `Добро пожаловать в ENSD SPORT!\n\nПлатформа спортивной аналитики с прогнозами на:\n- Футбол\n- Хоккей\n- MMA / UFC\n- Бокс\n\nНажмите кнопку ниже, чтобы открыть приложение.`,
      { reply_markup: keyboard }
    );
  });

  // Help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = ADMIN_TELEGRAM_IDS.includes(msg.from?.id.toString() || "");

    let helpText = `Команды ENSD SPORT:

/start - Начать и открыть приложение
/predictions - Последние прогнозы
/profile - Ваш профиль
/bonus - Получить ежедневный бонус
/vip - Информация о VIP подписке`;

    if (isAdmin) {
      helpText += `

Админ-команды:
/add - Добавить прогноз
/stats - Статистика платформы`;
    }

    await bot?.sendMessage(chatId, helpText);
  });

  // Predictions command
  bot.onText(/\/predictions/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const predictions = await storage.getPublicPredictions();
      const recentPredictions = predictions.slice(0, 5);

      if (recentPredictions.length === 0) {
        await bot?.sendMessage(chatId, "Пока нет доступных прогнозов.");
        return;
      }

      let message = "Последние прогнозы:\n\n";

      for (const p of recentPredictions) {
        const sportEmoji = getSportEmoji(p.sport);
        const vipBadge = p.isVip ? " [VIP]" : "";
        const statusEmoji = p.status === "won" ? "✅" : p.status === "lost" ? "❌" : "⏳";
        
        message += `${sportEmoji} ${p.team1} vs ${p.team2}${vipBadge}\n`;
        message += `${statusEmoji} ${p.isVip ? "***" : p.prediction}\n`;
        message += `📅 ${new Date(p.matchTime).toLocaleDateString("ru-RU")}\n\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: "Все прогнозы в приложении", web_app: { url: WEBAPP_URL } }],
        ],
      };

      await bot?.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      console.error("Error fetching predictions:", error);
      await bot?.sendMessage(chatId, "Ошибка загрузки прогнозов.");
    }
  });

  // Profile command
  bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    if (!userId) {
      await bot?.sendMessage(chatId, "Не удалось определить пользователя.");
      return;
    }

    try {
      const user = await storage.getUserByTelegramId(userId);
      
      if (!user) {
        await bot?.sendMessage(chatId, "Профиль не найден. Используйте /start для регистрации.");
        return;
      }

      const stats = await storage.getUserStats(user.id);
      
      let message = `👤 Ваш профиль\n\n`;
      message += `📊 Уровень: ${stats.level}\n`;
      message += `💰 Баллы: ${stats.points.toLocaleString()}\n`;
      message += `🔥 Серия: ${stats.streak} дней\n`;
      message += `📅 Активных дней: ${stats.activeDays}\n`;
      message += `👁 Просмотрено: ${stats.totalPredictionsViewed}\n\n`;
      message += stats.isVip 
        ? `⭐ VIP до: ${stats.vipExpiresAt ? new Date(stats.vipExpiresAt).toLocaleDateString("ru-RU") : "N/A"}`
        : "💎 Статус: Free\n\nОформите VIP для доступа к эксклюзивным прогнозам!";

      const keyboard = {
        inline_keyboard: [
          [{ text: "Открыть профиль", web_app: { url: `${WEBAPP_URL}/profile` } }],
        ],
      };

      await bot?.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      console.error("Error fetching profile:", error);
      await bot?.sendMessage(chatId, "Ошибка загрузки профиля.");
    }
  });

  // Daily bonus command
  bot.onText(/\/bonus/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    if (!userId) {
      await bot?.sendMessage(chatId, "Не удалось определить пользователя.");
      return;
    }

    try {
      const user = await storage.getUserByTelegramId(userId);
      
      if (!user) {
        await bot?.sendMessage(chatId, "Профиль не найден. Используйте /start для регистрации.");
        return;
      }

      const result = await storage.claimDailyBonus(user.id);
      
      let message = `🎁 Ежедневный бонус получен!\n\n`;
      message += `💰 +${result.points} баллов\n`;
      message += `🔥 Серия: ${result.newStreak} ${result.newStreak === 1 ? "день" : result.newStreak < 5 ? "дня" : "дней"}`;
      
      if (result.bonusMultiplier > 1) {
        message += `\n✨ Множитель: x${result.bonusMultiplier}`;
      }

      await bot?.sendMessage(chatId, message);
    } catch (error: any) {
      if (error.message === "Daily bonus already claimed") {
        await bot?.sendMessage(chatId, "Вы уже получили бонус сегодня! Приходите завтра.");
      } else {
        console.error("Error claiming bonus:", error);
        await bot?.sendMessage(chatId, "Ошибка получения бонуса.");
      }
    }
  });

  // VIP info command
  bot.onText(/\/vip/, async (msg) => {
    const chatId = msg.chat.id;

    const message = `⭐ VIP Подписка ENSD SPORT

Преимущества VIP:
• Доступ к закрытым прогнозам
• Прогнозы с высокими коэффициентами
• Ранний доступ к аналитике
• Эксклюзивные разборы матчей

💎 Стоимость: 100 звёзд/месяц

Оформите подписку в приложении!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "Оформить VIP", web_app: { url: `${WEBAPP_URL}/profile` } }],
      ],
    };

    await bot?.sendMessage(chatId, message, { reply_markup: keyboard });
  });

  // Admin: Add prediction command
  bot.onText(/\/add/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    if (!userId || !ADMIN_TELEGRAM_IDS.includes(userId)) {
      await bot?.sendMessage(chatId, "Эта команда доступна только администраторам.");
      return;
    }

    const message = `Добавление прогноза

Формат:
/addpred <спорт> | <команда1> | <команда2> | <прогноз> | <время> | [vip]

Виды спорта: football, hockey, mma, ufc, boxing

Пример:
/addpred football | Реал Мадрид | Барселона | Победа Реала | 2024-12-20 21:00 | vip`;

    await bot?.sendMessage(chatId, message);
  });

  // Admin: Add prediction with data
  bot.onText(/\/addpred (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    if (!userId || !ADMIN_TELEGRAM_IDS.includes(userId)) {
      await bot?.sendMessage(chatId, "Эта команда доступна только администраторам.");
      return;
    }

    const data = match?.[1];
    if (!data) {
      await bot?.sendMessage(chatId, "Неверный формат. Используйте /add для справки.");
      return;
    }

    try {
      const parts = data.split("|").map(s => s.trim());
      
      if (parts.length < 5) {
        await bot?.sendMessage(chatId, "Недостаточно данных. Используйте /add для справки.");
        return;
      }

      const [sport, team1, team2, prediction, timeStr, vipFlag] = parts;

      if (!SPORT_TYPES.includes(sport as SportType)) {
        await bot?.sendMessage(chatId, `Неверный вид спорта. Доступны: ${SPORT_TYPES.join(", ")}`);
        return;
      }

      const user = await storage.getUserByTelegramId(userId);
      if (!user) {
        await bot?.sendMessage(chatId, "Ошибка: пользователь не найден.");
        return;
      }

      const matchTime = new Date(timeStr);
      if (isNaN(matchTime.getTime())) {
        await bot?.sendMessage(chatId, "Неверный формат времени. Используйте: YYYY-MM-DD HH:MM");
        return;
      }

      const newPrediction = await storage.createPrediction({
        sport: sport as SportType,
        team1,
        team2,
        prediction,
        matchTime,
        isVip: vipFlag?.toLowerCase() === "vip",
        createdBy: user.id,
      });

      await bot?.sendMessage(chatId, `✅ Прогноз добавлен!\n\nID: ${newPrediction.id}\n${team1} vs ${team2}`);
    } catch (error) {
      console.error("Error adding prediction:", error);
      await bot?.sendMessage(chatId, "Ошибка добавления прогноза.");
    }
  });

  console.log("Telegram bot started");
  return bot;
}

function getSportEmoji(sport: SportType): string {
  const emojis: Record<SportType, string> = {
    football: "⚽",
    hockey: "🏒",
    mma: "🥊",
    ufc: "🥋",
    boxing: "🥊",
    other: "🏆",
  };
  return emojis[sport] || "🏆";
}

export function getBot() {
  return bot;
}

// Notify VIP users about new prediction
export async function notifyNewPrediction(prediction: any) {
  if (!bot) return;

  try {
    const users = await storage.getAllUsers();
    const vipUsers = users.filter(u => u.isVip);

    const sportEmoji = getSportEmoji(prediction.sport);
    const message = `🔔 Новый ${prediction.isVip ? "VIP " : ""}прогноз!\n\n${sportEmoji} ${prediction.team1} vs ${prediction.team2}\n📅 ${new Date(prediction.matchTime).toLocaleDateString("ru-RU")}`;

    for (const user of vipUsers) {
      try {
        await bot.sendMessage(parseInt(user.telegramId), message, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Смотреть", web_app: { url: WEBAPP_URL } }],
            ],
          },
        });
      } catch (err) {
        console.error(`Failed to notify user ${user.telegramId}:`, err);
      }
    }
  } catch (error) {
    console.error("Error notifying users:", error);
  }
}
