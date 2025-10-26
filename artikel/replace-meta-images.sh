#!/usr/bin/env bash
# ==============================================
# 🧹 Replace .jpg meta tags with .webp equivalents
# ✅ Jalankan langsung dari dalam folder artikel/
# ==============================================

LOG_FILE="replace-log.txt"

echo "🔍 Memulai pencarian file HTML di folder saat ini: $(pwd)"
echo "🧾 Log hasil: $LOG_FILE"
echo "---------------------------------------------" > "$LOG_FILE"

# Jalankan perl in-place replacement untuk semua file .html di folder ini dan subfoldernya
find . -type f -name "*.html" | while read -r FILE; do
  BEFORE_HASH=$(sha1sum "$FILE" | awk '{print $1}')

  perl -pi -e '
  s|"https://frijal\.pages\.dev/artikel/(.*?)\.jpg"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/artikel/(.*?)\.webp"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/img/(.*?)\.jpg"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/img/(.*?)\.webp"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/assets/og/(.*?)\.jpg"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/assets/(.*?)\.png"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/assets/(.*?)\.jpg"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/img/preview/(.*?)\.jpg"|"https://frijal.pages.dev/img/\1.webp"|g;
  s|"https://frijal\.pages\.dev/img/preview/(.*?)\.webp"|"https://frijal.pages.dev/img/\1.webp"|g;
   
  s|https://frijal.pages.dev/assets/favicon.ico|https://frijal.pages.dev/favicon.ico|g;
  s|https://frijal.pages.dev/apple-touch-icon.png|https://frijal.pages.dev/ext/icons/apple-touch-icon.png|g;
  
  s|<script defer src="/ext/iposbrowser.js"></script>|<script defer src="/ext/iposbrowser.js"></script><script src="/ext/webp.js" defer></script>
|g;
  
  ' "$FILE"

  AFTER_HASH=$(sha1sum "$FILE" | awk '{print $1}')

  if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
    echo "✅ Updated: $FILE" | tee -a "$LOG_FILE"
  else
    echo "— No changes: $FILE" >> "$LOG_FILE"
  fi
done

echo ""
echo "✨ Selesai! Lihat hasil di $LOG_FILE"
