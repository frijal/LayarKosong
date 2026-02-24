# 1. Gunakan image Bun resmi sebagai base
FROM oven/bun:latest

# 2. Install library sistem yang dibutuhin Puppeteer/Chrome
# Ini krusial karena Bun image basic nggak punya library GUI Linux
RUN apt-get update && apt-get install -y \
    libgbm-dev \
    nss \
    fonts-liberation \
    libasound2 \
    libnspr4 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 3. Set working directory
WORKDIR /app

# 4. Copy package.json dan bun.lockb duluan (biar caching kenceng)
COPY package.json bun.lock ./

# 5. Install dependencies pakai Bun
RUN bun install --frozen-lockfile

# 6. Copy semua sisa kode skrip kamu
COPY . .

# 7. Default command (bisa diganti saat running)
CMD ["bun", "run", "ci-all"]
