# Используем Node.js с поддержкой TypeScript
FROM node:20

# Рабочая директория — корень проекта (там package.json)
WORKDIR /usr/src/app

# Копируем package.json и tsconfig.json из корня
COPY package*.json tsconfig.json ./

# Устанавливаем зависимости
RUN npm install
RUN npm install -g ts-node typescript

# Копируем весь проект
COPY . .

# Открываем порт (если нужен, например для вебхука)
EXPOSE 3000

# Запускаем бота из папки server
CMD ["npx", "ts-node", "server/index.ts"]
