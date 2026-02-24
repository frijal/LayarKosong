# 1. Gunakan image Bun versi terbaru sebagai base
FROM oven/bun:latest

# 2. Set environment agar Puppeteer tidak mendownload Chrome sendiri 
# (Opsional, tapi bagus untuk kontrol versi)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 3. Install dependencies sistem untuk Headless Chrome & Sharp
# Kita pakai Debian Trixie (base image terbaru Bun)
RUN apt-get update && apt-get install -y \
    libgbm-dev \
    fonts-liberation \
    libasound2 \
    libnspr4 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    gnupg \
    --no-install-recommends && \
    # Tambahkan repository Chrome untuk install Chrome stabil
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && apt-get install -y google-chrome-stable --no-install-recommends && \
    # Bersihkan cache agar image tidak bengkak
    rm -rf /var/lib/apt/lists/*

# 4. Set working directory
WORKDIR /app

# 5. Copy file konfigurasi package
# Kita copy bun.lock (jika ada) dan package.json saja dulu untuk caching layer
COPY package.json bun.lock* ./

# 6. Install dependensi
# Tanpa --frozen-lockfile agar Bun bisa otomatis migrasi format lockfile jika perlu
RUN bun install

# 7. Copy seluruh sisa kode aplikasi
COPY . .

# 8. Jalankan aplikasi (sesuaikan dengan command kamu)
CMD ["bun", "run", "ci-all"]
