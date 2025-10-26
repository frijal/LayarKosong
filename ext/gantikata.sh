#!/usr/bin/env bash
# 🔧 Script: perbaiki-artikel-icons.sh
# 📁 Fungsi: Find-and-replace otomatis untuk memperbarui ikon & metadata HTML di folder artikel/
# ⚙️ Fitur:
#   ✅ Opsi --dry-run : tampilkan perubahan (diff) tanpa menulis ke file
#   ✅ Log semua hasil ke perbaikan.log
# 🐚 Kompatibel: Bash shell (Linux/macOS/WSL)

LOGFILE="perbaikan.log"
DRYRUN=false

# ────────────────────────────────
#  Argumen
# ────────────────────────────────
if [[ "$1" == "--dry-run" ]]; then
  DRYRUN=true
  echo "🧪 Mode DRY-RUN aktif — menampilkan perubahan tanpa menyimpan ke file." | tee "$LOGFILE"
  echo "" | tee -a "$LOGFILE"
else
  echo "🚀 Memulai proses find-and-replace pada semua file HTML di folder artikel/" | tee "$LOGFILE"
  echo "" | tee -a "$LOGFILE"
fi

# ────────────────────────────────
#  Validasi folder
# ────────────────────────────────
if [ ! -d "artikel" ]; then
  echo "❌ Folder 'artikel' tidak ditemukan di direktori ini!" | tee -a "$LOGFILE"
  exit 1
fi

# ────────────────────────────────
#  Daftar regex penggantian
# ────────────────────────────────
declare -a REPLACEMENTS=(
's#https://frijal.github.io/assets/apple-touch-icon.png#https://frijal.github.io/ext/icons/apple-touch-icon.png#g'
's#https://frijal.github.io/assets/favicon/apple-touch-icon.png#https://frijal.github.io/ext/icons/apple-touch-icon.png#g'
's#YOUR_APP_ID#1471267430691023#g'
's#YOUR_FACEBOOK_APP_ID#1471267430691023#g'
's#YOUR_FACEBOOK_APP_ID_HERE#1471267430691023#g'
's#https://frijal.github.io/assets/favicon.svg#https://frijal.github.io/favicon.svg#g'
's#https://frijal.github.io/assets/favicon/favicon.ico#https://frijal.github.io/favicon.ico#g'
's#https://frijal.github.io/assets/favicon/favicon.svg#https://frijal.github.io/favicon.svg#g'
's#https://frijal.github.io/assets/safari-pinned-tab.svg#https://frijal.github.io/favicon.svg#g'
's#https://frijal.github.io/assets/favicon#https://frijal.github.io/ext/icons/favicon#g'
's#https://frijal.github.io/assets/manifest.webmanifest#https://frijal.github.io/site.webmanifest#g'
's#https://frijal.github.io/assets/logo.png#https://frijal.github.io/logo.png#g'
's#nama_twitter_anda#frijal#g'
's#username_twitter#frijal#g'
's#yourtwitterhandle#frijal#g'
's/&copy;/🄯/g'
's/©/🄯/g'
's#href="https://frijal.github.io/artikel/"#href="https://frijal.github.io/artikel.html"#g'
)

# ────────────────────────────────
#  Proses setiap file
# ────────────────────────────────
for file in artikel/*.html; do
  echo "📄 Memproses: $file" | tee -a "$LOGFILE"

  if [[ "$DRYRUN" == true ]]; then
    # Buat versi sementara untuk preview perubahan
    TMPFILE=$(mktemp)

    cp "$file" "$TMPFILE"
    for rule in "${REPLACEMENTS[@]}"; do
      perl -pi -w -e "$rule" "$TMPFILE"
    done

    # Bandingkan perubahan
    if ! diff -q "$file" "$TMPFILE" >/dev/null; then
      echo "⚠️  Ada perubahan yang akan diterapkan pada: $file" | tee -a "$LOGFILE"
      echo "──────────────────────────────────────────────" | tee -a "$LOGFILE"
      diff --color=always -u "$file" "$TMPFILE" | tee -a "$LOGFILE"
      echo "──────────────────────────────────────────────" | tee -a "$LOGFILE"
      echo "" | tee -a "$LOGFILE"
    else
      echo "✅ Tidak ada perubahan yang diperlukan." | tee -a "$LOGFILE"
      echo "" | tee -a "$LOGFILE"
    fi

    rm -f "$TMPFILE"
  else
    # Jalankan penggantian langsung
    for rule in "${REPLACEMENTS[@]}"; do
      perl -pi -w -e "$rule" "$file"
    done
    echo "✅ Selesai memperbarui $file" | tee -a "$LOGFILE"
    echo "" | tee -a "$LOGFILE"
  fi
done

# ────────────────────────────────
#  Selesai
# ────────────────────────────────
if [[ "$DRYRUN" == true ]]; then
  echo "🧾 Mode dry-run selesai — lihat detail perbedaan di '$LOGFILE'." | tee -a "$LOGFILE"
else
  echo "🎉 Semua file telah diperbarui dengan sukses!" | tee -a "$LOGFILE"
fi
