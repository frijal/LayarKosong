#!/bin/bash

# =================================================================
# FINAL REPAIR & LOCKFILE PURIFIER (Layar Kosong)
# =================================================================

echo "🚀 Memulai Operasi Purifikasi Dependensi..."

# 1. Hapus sisa-sisa lama yang 'beracun'
echo "🧹 Membuang node_modules dan package-lock lama..."
rm -rf node_modules package-lock.json

# 2. Bersihkan cache NPM agar tidak menarik metadata deprecated
echo "🧼 Membersihkan NPM Cache..."
npm cache clean --force

# 3. Re-install dari nol (Ini akan membangun silsilah baru yang bersih)
echo "📦 Membangun ulang silsilah dependensi (Fresh Install)..."
# Kita pakai install biasa supaya package-lock.json tercipta dengan sempurna
npm install

# 4. Verifikasi apakah node-domexception masih nyempil
echo "🔍 Verifikasi akhir..."
if npm ls node-domexception > /dev/null 2>&1; then
    echo "⚠️ node-domexception masih terdeteksi sebagai sub-dependensi."
    echo "🛠️ Mencoba Force Dedupe..."
    npm dedupe
else
    echo "✅ BERHASIL: node-domexception sudah tidak ada di silsilah!"
fi

echo "✨ Selesai! Sekarang silakan: git add package-lock.json && git commit -m 'chore: purify lockfile'"
