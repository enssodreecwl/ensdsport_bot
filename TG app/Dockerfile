# ====== Base image ======
FROM python:3.12-slim

# ====== Install system dependencies + Node ======
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ====== Working directory ======
WORKDIR /app

# ====== Install Python dependencies ======
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip check

# ====== Copy Node dependencies ======
COPY server/package*.json ./server/
RUN cd server && npm install --production

# ====== Copy full project ======
COPY . .

# ====== Create directories ======
RUN mkdir -p /app/data /app/static /app/templates \
    && chmod -R 755 /app/data

# ====== Expose port ======
EXPOSE 3000

# ====== Health check ======
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# ====== Start application ======
CMD ["sh", "-c", "node server/index.js & python main.py"]