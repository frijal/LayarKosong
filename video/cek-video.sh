#!/bin/bash

# 1. Pastikan file ada
if ! ls *.mp4 >/dev/null 2>&1; then
    echo "Error: Tidak ada file .mp4 ditemukan."
    exit 1
fi

# 2. Buat daftar file yang rapi (diurutkan secara numerik)
echo "Membuat daftar file..."
> list.txt
for f in $(ls -1v *.mp4); do
    echo "file '$f'" >> list.txt
done

# 3. Eksekusi FFmpeg
# Target resolusi tetap 1920x1080 (16:9)
target_w=1920
target_h=1080

echo "Memproses penggabungan ke kanvas 16:9 dengan orientasi asli..."

# Penjelasan filter:
# -autorotate: Membaca metadata rotasi (misal video HP vertikal)
# force_original_aspect_ratio=decrease: Mengecilkan video agar masuk ke bingkai tanpa mengubah rasio
# pad: Menempatkan video tepat di tengah kanvas 1920x1080
# -map_metadata -1: Menghapus semua info metadata sensitif



ffmpeg -f concat -safe 0 -autorotate -i list.txt \
-vf "scale=${target_w}:${target_h}:force_original_aspect_ratio=decrease,pad=${target_w}:${target_h}:(ow-iw)/2:(oh-ih)/2" \
-c:v libx264 -crf 23 -c:a copy \
-map_metadata -1 -metadata title="" -metadata author="" \
-y output_final.mp4

# 4. Selesai
if [ -f "output_final.mp4" ]; then
    rm list.txt
    echo "Sukses! Video selesai digabung dengan orientasi terjaga dan metadata dibersihkan."
else
    echo "Error: Proses penggabungan gagal."
fi