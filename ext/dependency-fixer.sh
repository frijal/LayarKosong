#!/bin/bash

echo "🚀 Operasi Pembersihan Akar (Anti node-domexception & ELSPROBLEMS)..."

if [ -f package.json ]; then
    # 1. Hapus paksa paket yang bermasalah dan induknya
    echo "🧹 Menghapus node-fetch dan cache terkait..."
    npm uninstall node-fetch fetch-blob node-domexception --save

    # 2. Hapus total file pengunci lama dan folder bayangan
    echo "🔄 Resetting Dependency Tree..."
    rm -rf node_modules package-lock.json
    
    # 3. Re-install SEBENARNYA (bukan cuma lock-only) agar depcheck tidak error
    # Kita pakai --no-audit biar cepat
    echo "📦 Re-installing fresh dependencies..."
    npm install --no-audit

    # 4. Bersihkan cache npm
    echo "🧼 Cleaning npm cache..."
    npm cache clean --force
    
    echo "✨ Selesai! Silsilah sekarang harusnya bersih."
else
    echo "❌ package.json tidak ditemukan."
    exit 1
fi
