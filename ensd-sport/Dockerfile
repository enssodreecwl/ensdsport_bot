# Базовый образ Node.js
FROM node:20

# Рабочая директория внутри контейнера
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json, tsconfig.json
COPY package*.json tsconfig.json ./

# Устанавливаем зависимости
RUN npm install
RUN npm install -g ts-node typescript

# Копируем весь проект
COPY . .

# Открываем порт (если нужен для вебхука)
EXPOSE 3000

# Запускаем бота
CMD ["npx", "ts-node", "server/index.ts"]
