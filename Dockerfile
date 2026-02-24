# 1. Base image tetap Bun
FROM oven/bun:latest

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies & Google Chrome (Pakai pola modern yang kamu mau)
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    lsb-release \
    libgbm-dev \
    fonts-liberation \
    libasound2 \
    libnspr4 \
    libnss3 \
    xdg-utils \
    --no-install-recommends && \
    # Buat folder keyring (tanpa sudo karena di Docker kita sudah root)
    mkdir -p /etc/apt/keyrings && \
    # Ambil kunci Google Chrome
    curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg && \
    # Tambahkan repo Chrome pakai signed-by
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    # Update dan install Chrome
    apt-get update && apt-get install -y google-chrome-stable --no-install-recommends && \
    # Bersihkan sampah
    rm -rf /var/lib/apt/lists/*

# 4. Copy file package & Install dependencies aplikasi
COPY package.json bun.lock* ./
RUN bun install

# 5. Copy sisa kode & Command jalan
COPY . .
CMD ["bun", "run", "ci-all"]
