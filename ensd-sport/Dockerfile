# Базовый образ Python
FROM python:3.12-slim

# Рабочая директория внутри контейнера
WORKDIR /usr/src/app

# Копируем зависимости и устанавливаем их
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект внутрь контейнера
COPY . .

# Создаём папку для данных, если нужна
RUN mkdir -p /app/data && chmod 777 /app/data

# Открываем порт 3000 для Mini App
EXPOSE 3000

# Запуск Python бота
CMD ["python", "ensd-sport/main.py"]
