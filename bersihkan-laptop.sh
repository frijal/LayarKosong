#!/bin/bash

# =================================================================
# LAPTOP CLEANER - Operasi Jejak Digital
# =================================================================

echo "🧹 Membersihkan sisa pengerjaan dari laptop..."

# 1. Hapus folder node_modules yang ukurannya raksasa (terutama karena Puppeteer)
if [ -d node_modules ]; then
    echo "🗑️ Menghapus node_modules (Menghemat ratusan MB)..."
    rm -rf node_modules
fi

# 2. Hapus file log NPM yang tidak berguna
if [ -f npm-debug.log ]; then
    rm npm-debug.log
fi

# 3. Hapus cache Puppeteer (Ini yang biasanya paling makan tempat)
# Puppeteer sering download Chromium di folder tersembunyi
echo "🐧 Membersihkan cache browser Puppeteer..."
rm -rf ~/.cache/puppeteer

# 4. Hapus script fixer ini sendiri (opsional)
# rm final-repair.sh bersihkan-laptop.sh

echo "✅ Laptop bersih kembali! Repository tetap aman karena package-lock.json sudah di-push."
