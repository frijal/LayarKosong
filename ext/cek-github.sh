#!/bin/bash
echo "=== 🔍 GitHub Diagnosis Script + Rekomendasi ==="

# 1. Tes ping
echo -e "\n[1] Tes koneksi ke github.com ..."
PING_RESULT=$(ping -c 4 github.com)
echo "$PING_RESULT"

LOSS=$(echo "$PING_RESULT" | grep -oP '\d+(?=% packet loss)')
AVG=$(echo "$PING_RESULT" | grep -oP '(?<=avg/)[0-9.]+' | cut -d'/' -f1)

if [ "$LOSS" -gt 20 ]; then
  echo "⚠️ Banyak packet loss → coba ganti jaringan atau pakai VPN."
elif [ "$(echo "$AVG > 250" | bc)" -eq 1 ]; then
  echo "⚠️ Latency tinggi ($AVG ms) → koneksi ke GitHub lambat, coba VPN."
else
  echo "✅ Koneksi dasar ke GitHub cukup stabil."
fi

# 2. Tes HTTPS response
echo -e "\n[2] Tes respon HTTPS ..."
CURL_RESULT=$(curl -I -s -m 5 https://github.com | head -n 1)
echo "$CURL_RESULT"
if [[ "$CURL_RESULT" == *"200"* ]]; then
  echo "✅ GitHub web merespon normal."
else
  echo "⚠️ Respon HTTPS bermasalah → bisa jadi gangguan GitHub global."
fi

# 3. Tes git ls-remote
echo -e "\n[3] Tes git ls-remote (cek metadata repo publik) ..."
START=$(date +%s)
git ls-remote https://github.com/git/git.git >/dev/null 2>&1
END=$(date +%s)
DURATION=$((END - START))
echo "Durasi: ${DURATION}s"
if [ "$DURATION" -gt 5 ]; then
  echo "⚠️ Metadata fetch lambat → koneksi ke GitHub repo bermasalah."
else
  echo "✅ Metadata fetch cepat."
fi

# 4. Cek ukuran repo lokal
if [ -d ".git" ]; then
  echo -e "\n[4] Info ukuran repo lokal ..."
  git count-objects -vH
  SIZE=$(git count-objects -vH | grep size-pack | awk '{print $2}')
  if [[ "$SIZE" == *G ]]; then
    echo "⚠️ Repo sangat besar → pertimbangkan partial clone atau sparse-checkout."
  elif [[ "$SIZE" == *M && ${SIZE%M} -gt 500 ]]; then
    echo "⚠️ Repo besar (>500MB) → coba git gc atau pecah repo."
  else
    echo "✅ Ukuran repo masih wajar."
  fi
else
  echo -e "\n[4] Tidak ada repo lokal terdeteksi (skip)."
fi

echo -e "\n=== ✅ Diagnosis selesai. Gunakan rekomendasi di atas. ==="
