#!/bin/bash

echo "🚀 Operasi Pembersihan Akar (Anti node-domexception)..."

if [ -f package.json ]; then
    # 1. Hapus secara paksa dari package.json dan node_modules
    echo "🧹 Menghapus node-fetch dan sisa-sisanya..."
    npm uninstall node-fetch fetch-blob node-domexception --save

    # 2. Paksa NPM untuk membangun ulang silsilah tanpa paket lama
    echo "🔄 Rebuilding package-lock.json..."
    rm -rf node_modules package-lock.json
    npm install --package-lock-only

    # 3. Bersihkan cache yang mungkin masih menyimpan metadata lama
    echo "🧼 Cleaning npm cache..."
    npm cache clean --force
    
    echo "✨ Selesai! Seharusnya warning deprecated sudah hilang."
else
    echo "❌ package.json tidak ditemukan."
    exit 1
fi
