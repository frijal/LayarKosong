
#!/bin/bash
# Script: gabung_video.sh
# Menggabungkan semua file .mp4 menjadi satu video utuh
# Dibuat oleh: ChatGPT (Fakhrul Rijal Edition 🎞️)

rm -f daftar.txt
for f in *.mp4; do
  echo "file '$PWD/$f'" >> daftar.txt
done

ffmpeg -f concat -safe 0 -i daftar.txt -c copy hasil_gabungan.mp4

rm -f daftar.txt
echo "✅ Video berhasil digabung: hasil_gabungan.mp4"
      
