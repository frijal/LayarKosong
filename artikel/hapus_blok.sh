#!/bin/bash

# ===================================================================
# hapus_blok.sh (Skrip Eksekusi)
#
# TUJUAN: Menemukan DAN MENGHAPUS blok HTML berdasarkan pola
# yang ada di file 'pola.txt'.
# PERINGATAN: Skrip ini akan mengubah file secara permanen!
# ===================================================================

# Nama file yang berisi blok HTML yang akan dihapus
PATTERN_FILE="pola.txt"

# --- [Pemeriksaan Awal] ---
if [ ! -f "$PATTERN_FILE" ]; then
  echo "❌ KESALAHAN: File pola '$PATTERN_FILE' tidak ditemukan!"
  exit 1
fi

echo "📖 Membaca pola dari '$PATTERN_FILE' untuk dihapus..."
export PATTERN_TO_FIND=$(cat "$PATTERN_FILE")

echo "🔥 Memulai proses penghapusan blok di semua file *.html..."
echo "--------------------------------------------------------"

# Loop melalui setiap file .html
for file in *.html; do
  if [ -f "$file" ]; then

    # Perintah Perl untuk MENGHAPUS blok yang cocok secara langsung di dalam file.
    # -i    : Mengaktifkan mode "in-place edit" (mengubah file asli).
    # -p    : Loop melalui file dan mencetak hasilnya (standar untuk in-place edit).
    # s/...// : Perintah substitusi (ganti), mengganti pola yang ditemukan dengan KOSONG.
    
    perl -0777 -i -pe '
      my $pattern = $ENV{"PATTERN_TO_FIND"};
      s/\Q$pattern\E//g
    ' "$file"

    echo "✅ Selesai memproses file: $file"
  fi
done

echo "--------------------------------------------------------"
echo "🎉 Proses penghapusan selesai untuk semua file."
echo "Silakan periksa beberapa file secara manual untuk memastikan blok telah terhapus."
