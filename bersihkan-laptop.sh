#!/bin/bash
echo "🧹 Operasi pembersihan jejak digital..."

# Hapus folder berat
rm -rf node_modules

# Bersihkan cache global npm agar tidak menumpuk
npm cache clean --force

# Hapus cache browser jika ada sisa dari percobaan sebelumnya
rm -rf ~/.cache/puppeteer

echo "✨ Laptop kamu sekarang bersih kembali!"
