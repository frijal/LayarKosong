# Gunakan image resmi Bun yang ringan
FROM oven/bun:1-slim AS base
WORKDIR /app

# Copy file dependency
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy seluruh kode
COPY . .

# Jalankan aplikasi
USER bun
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "start" ]
