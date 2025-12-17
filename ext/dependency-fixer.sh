#!/bin/bash

# =================================================================
# Dependency Fixer - Layar Kosong
# Fungsi: Memaksa upgrade paket yang menarik dependensi deprecated
# =================================================================

echo "🚀 Memulai Operasi Dependency Fixer..."

if [ -f package.json ]; then
    echo "🔍 Mencari induk dari node-domexception..."
    
    # Mencari paket utama yang menggunakan node-domexception
    # Kita ambil level tertinggi di pohon dependensi
    PARENT_PKG=$(npm ls node-domexception --depth=1 --json 2>/dev/null | jq -r '.dependencies | keys[0]' 2>/dev/null)

    if [ ! -z "$PARENT_PKG" ] && [ "$PARENT_PKG" != "null" ]; then
        echo "🚨 Terdeteksi: '$PARENT_PKG' adalah pihak yang menarik node-domexception."
        echo "🆙 Mencoba melakukan force upgrade pada $PARENT_PKG..."
        npm install "$PARENT_PKG@latest" --save
    else
        echo "✅ Tidak ditemukan induk langsung yang mencurigakan."
    fi

    # Langkah Tambahan: Audit Fix & Prune
    echo "🧹 Melakukan pembersihan sisa-sisa paket..."
    npm audit fix --force || true
    npm prune
    
    echo "✨ Selesai! package-lock.json telah diperbarui."
else
    echo "❌ Error: package.json tidak ditemukan di root!"
    exit 1
fi
