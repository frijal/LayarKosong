#!/bin/bash

# Script untuk mengganti twitter.com/frijal menjadi twitter.com/responaja
# Hanya pada URL Twitter/X, di semua file .html secara recursive
# Tidak mengubah @frijal atau teks lainnya

echo "Mencari file .html di folder ini dan subfolder..."

# Cek apakah ada file .html
if ! find . -type f -name "*.html" -print -quit | grep -q .; then
    echo "Tidak ditemukan file .html di folder ini atau subfolder."
    exit 1
fi

# Buat backup semua file .html
echo "Membuat backup file (.html.bak)..."
find . -type f -name "*.html" -exec cp -p {} {}.bak \;

# Lakukan penggantian hanya pada pola twitter.com/frijal
# Pola ini mencakup variasi umum seperti:
# https://twitter.com/frijal
# http://twitter.com/frijal
# twitter.com/frijal
# www.twitter.com/frijal
# dan dengan atau tanpa path tambahan (/status/... dll)

echo "Mengganti twitter.com/frijal → twitter.com/responaja ..."
find . -type f -name "*.html" -exec sed -i \
    -e 's|twitter\.com/frijal|twitter.com/responaja|gI' \
    -e 's|www\.twitter\.com/frijal|www.twitter.com/responaja|gI' \
    -e 's|https\?://twitter\.com/frijal|https://twitter.com/responaja|gI' \
    -e 's|https\?://www\.twitter\.com/frijal|https://twitter.com/responaja|gI' {} +

echo "Selesai!"
echo ""
echo "Penggantian hanya dilakukan pada URL Twitter/X yang mengarah ke frijal."
echo "Contoh yang diubah:"
echo "   https://twitter.com/frijal      → https://twitter.com/responaja"
echo "   twitter.com/frijal/status/123   → twitter.com/responaja/status/123"
echo ""
echo "Username @frijal di teks atau meta tag tetap tidak berubah."
echo ""
echo "Total file .html yang diproses:"
find . -type f -name "*.html" | wc -l
echo ""
echo "Backup tersedia dengan ekstensi .bak."
echo "Untuk mengembalikan perubahan:"
echo "   find . -name '*.html.bak' -exec sh -c 'mv \"\$0\" \"\${0%.bak}\"' {} \\;"
