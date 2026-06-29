#!/bin/bash
echo "🚀 Memulai sinkronisasi akhir Layar Kosong..."

# Hapus sisa lama agar tidak ada konflik silsilah
rm -rf node_modules package-lock.json

# Install ulang secara penuh (Membuat lockfile versi 3 yang stabil)
# Kita skip download chromium di laptop biar cepat
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install

echo "✅ Selesai! Silakan commit dan push package-lock.json terbaru ini ke GitHub."
