# Базовый образ Node.js
FROM node:20

# Рабочая директория внутри контейнера
WORKDIR /usr/src/app

# Копируем package.json и tsconfig.json из папки ensd-sport
COPY ensd-sport/package*.json ensd-sport/tsconfig.json ./

# Устанавливаем зависимости
RUN npm install
RUN npm install -g ts-node typescript

# Копируем весь проект
COPY . .

# Открываем порт (если нужен для вебхука)
EXPOSE 3000

# Запускаем бота
CMD ["npx", "ts-node", "ensd-sport/server/index.ts"]
