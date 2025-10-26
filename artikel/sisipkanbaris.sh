#!/bin/bash
# Jalankan script ini dari dalam folder artikel/

for file in *.html; do
  echo "🔍 Memproses $file ..."

  # Tambah div iposbrowser setelah </h1>
 # if grep -qi 'document.addEventListener('DOMContentLoaded', () => {' "$file"; then
  #  echo "ℹ️ Sudah ada document.addEventListener('DOMContentLoaded', () => { di $file"
  # else
   #  sed -i '/<script>/a document.addEventListener('DOMContentLoaded', () => {' "$file"
   # echo "✅ document.addEventListener('DOMContentLoaded', () => { di $file"
  #fi

  ### Tambah related marquee + script sebelum </body>
 #if grep -qi 'defer src="/ext/ipos' "$file"; then
  #  echo "ℹ️ Sudah ada skrip related di $file"
 # else
    sed -i '/<\/script>/i });' "$file"
    echo "✅ Ditambahkan skrip iposbrowser di $file"
 # fi

done
