# 1. Base image tetap Bun
FROM oven/bun:latest

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies sistem & Google Chrome (Versi Fix SSL)
RUN apt-get update && apt-get install -y \
    ca-certificates \
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
    # Pastikan sertifikat terupdate
    update-ca-certificates && \
    # Buat folder keyring
    mkdir -p /etc/apt/keyrings && \
    # Download kunci Google (Pakai -k jika tetap error 77, tapi coba tanpa -k dulu)
    curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg && \
    # Tambahkan repo
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    # Install Chrome
    apt-get update && apt-get install -y google-chrome-stable --no-install-recommends && \
    # Bersih-bersih
    rm -rf /var/lib/apt/lists/*
# 4. Copy file package & Install dependencies aplikasi
COPY package.json bun.lock* ./
RUN bun install

# 5. Copy sisa kode & Command jalan
COPY . .
CMD ["bun", "run", "ci-all"]
