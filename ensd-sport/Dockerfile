# Используем Node.js с поддержкой TypeScript
FROM node:20

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm install
RUN npm install -g ts-node typescript

COPY . .

EXPOSE 3000

# Запускаем бот
CMD ["npx", "ts-node", "server/index.ts"]
