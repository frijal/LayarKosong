#!/bin/bash

# ===================================================================
# cari_blok_dinamis.sh (Skrip Diagnostik Versi Dinamis)
#
# Tujuan skrip ini adalah untuk MENEMUKhhAN blok HTML dengan membaca
# pola pencarian langsung dari sebuah file (pola.txt).
# ===================================================================

# Nama file yang berisi blok HTML yang akan dicari
PATTERN_FILE="pola.txt"

OUTPUT_FILE="blok_ditemukan.txt"
rm -f "$OUTPUT_FILE"

# --- [Pemeriksaan Awal] ---
# Periksa apakah file pola ada sebelum melanjutkan
if [ ! -f "$PATTERN_FILE" ]; then
  echo "❌ KESALAHAN: File pola '$PATTERN_FILE' tidak ditemukan!"
  echo "Harap buat file tersebut dan isi dengan blok HTML yang ingin Anda cari."
  exit 1
fi

echo "📖 Membaca pola dari '$PATTERN_FILE'..."
# Baca seluruh isi file pola ke dalam variabel, lalu 'export' agar bisa dibaca Perl
export PATTERN_TO_FIND=$(cat "$PATTERN_FILE")

echo "🔎 Menjalankan skrip diagnostik..."
echo "Mencari blok HTML di semua file *.html..."
echo "--------------------------------------------------------"

for file in *.html; do
  if [ -f "$file" ]; then

    # Perintah Perl kini membaca pola dari environment variable 'PATTERN_TO_FIND'
    # \Q dan \E digunakan untuk "mengutip" pola secara otomatis.
    # Ini memastikan semua karakter khusus (seperti /, $, ?, dll.)
    # diperlakukan sebagai teks biasa, bukan sebagai perintah regex.
    # Ini adalah kunci mengapa metode ini sangat kuat dan akurat.
    
    MATCH=$(perl -0777 -ne '
      my $pattern = $ENV{"PATTERN_TO_FIND"};
      if (/\Q$pattern\E/s) {
        print $&
      }
    ' "$file")

    if [ -n "$MATCH" ]; then
      echo "✅ Blok ditemukan di file: $file"
      echo "========================================================" >> "$OUTPUT_FILE"
      echo "Ditemukan di: $file" >> "$OUTPUT_FILE"
      echo "========================================================" >> "$OUTPUT_FILE"
      echo "$MATCH" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
    else
      echo "❌ Blok tidak ditemukan di file: $file"
    fi
  fi
done

echo "--------------------------------------------------------"
if [ -s "$OUTPUT_FILE" ]; then
  echo "🎉 Selesai! Blok yang ditemukan telah diekstrak ke '$OUTPUT_FILE'."
else
  echo "🤷‍♂️ Selesai. Tidak ada blok yang cocok yang ditemukan di file manapun."
fi
