#!/bin/bash

# Script untuk mengganti twitter:site content="@frijal" menjadi "@responaja"
# Hanya pada tag meta twitter:site, tidak mengganti @frijal di tempat lain
# Berlaku untuk semua file .html secara recursive

echo "Mencari file .html di folder ini dan subfolder..."

# Cek apakah ada file .html
if ! find . -type f -name "*.html" -print -quit | grep -q .; then
    echo "Tidak ditemukan file .html di folder ini atau subfolder."
    exit 1
fi

# Buat backup semua file .html
echo "Membuat backup file (.html.bak)..."
find . -type f -name "*.html" -exec cp -p {} {}.bak \;

# Lakukan penggantian hanya pada bagian twitter:site content
echo "Mengganti twitter:site content=\"@frijal\" menjadi \"@responaja\"..."
find . -type f -name "*.html" -exec sed -i \
    -e 's/\(twitter:site"[^>]*content="\)[@]frijal\("\)/\1@responaja\2/gI' {} +

echo "Selesai!"
echo ""
echo "Penggantian hanya dilakukan pada tag meta dengan name=\"twitter:site\""
echo "Username @frijal di tempat lain (misalnya di teks konten) tetap tidak berubah."
echo ""
echo "Total file .html yang diproses:"
find . -type f -name "*.html" | wc -l
echo ""
echo "Backup tersedia dengan ekstensi .bak. Jika ingin mengembalikan:"
echo "   find . -name '*.html.bak' -exec sh -c 'mv \"\$0\" \"\${0%.bak}\"' {} \\;"
