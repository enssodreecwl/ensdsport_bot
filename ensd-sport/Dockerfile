# Используем официальный образ Python
FROM python:3.12-slim

# Рабочая директория внутри контейнера
WORKDIR /usr/src/app

# Копируем файлы с зависимостями
COPY requirements.txt ./

# Устанавливаем зависимости Python
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект
COPY . .

# Открываем порт 3000 для Mini App (aiohttp)
EXPOSE 3000

# Переменная окружения с токеном (можно задавать на Ботхосте)
# ENV BOT_TOKEN=ваш_токен_бота

# Запуск бота
CMD ["python", "main.py"]
