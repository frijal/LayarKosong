# 1. Base image Bun (Native)
FROM oven/bun:latest

# 2. Set environment untuk Chrome & Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    PYTHONUNBUFFERED=1 \
    # Tambahkan path Node ke environment
    NODE_MAJOR=20 

# 3. Install SEMUA bumbu sistem dalam satu layer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    curl \
    gnupg \
    lsb-release \
    # Bahasa Pemrograman & Tooling Standar
    python3 \
    python3-pip \
    perl \
    sed \
    grep \
    git \
    # Dependencies untuk Puppeteer & Sharp
    libgbm-dev \
    fonts-liberation \
    libasound2 \
    libnspr4 \
    libnss3 \
    xdg-utils \
    --no-install-recommends && \
    # --- INSTALASI NODE.JS (Versi 20 LTS) ---
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    # --- INSTALASI GOOGLE CHROME ---
    curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    # Update dan Install Node & Chrome sekaligus
    apt-get update && apt-get install -y nodejs google-chrome-stable --no-install-recommends && \
    # Bersihkan cache agar image tidak obesitas
    rm -rf /var/lib/apt/lists/*

# 4. Set working directory
WORKDIR /app

# 5. Copy & Install Bun Dependencies (Caching Layer)
COPY package.json bun.lock* ./
RUN bun install

# 6. Copy seluruh file project Layar Kosong
COPY . .

# Secara default jalankan ci-all
CMD ["bun", "run", "ci-all"]
