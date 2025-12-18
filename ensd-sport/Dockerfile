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
WORKDIR /usr/src/app

# ====== Copy Python dependencies ======
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ====== Copy Node dependencies ======
COPY package*.json ./
RUN npm install

# ====== Copy full project ======
COPY . .

# ====== Build frontend ======
RUN npm run build

# ====== Expose port for Render ======
EXPOSE 10000

# ====== Start Node server (Python bot запускается внутри index.ts) ======
CMD ["node", "server/index.js"]
