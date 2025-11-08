#!/usr/bin/env bash
# ===========================================================
# ⚙️ replace-html-assets.sh
# Ganti semua link/script eksternal (.js/.css) ke versi lokal
# Dengan backup otomatis & log hasil perubahan
# ===========================================================

echo "🔧 Memulai proses penggantian referensi eksternal..."
mkdir -p mini
LOGFILE="mini/html-assets-replaced.log"
: > "$LOGFILE"

# Daftar pola yang akan diganti
declare -A REPLACEMENTS=(
  ["https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@.*/build/highlight.min.js"]="/ext/highlight.js"
  ["https://cdn.jsdelivr.net/npm/highlight.js@[^/]+/highlight.min.js"]="/ext/highlight.js"
  ["https://cdnjs.cloudflare.com/ajax/libs/highlight.js/.*/highlight.min.js"]="/ext/highlight.js"
  ["https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@.*/build/styles/github.min.css"]="/ext/github.min.css"
  ["https://cdn.jsdelivr.net/npm/highlight.js@[^/]+/styles/github.min.css"]="/ext/github.min.css"
  ["https://cdnjs.cloudflare.com/ajax/libs/highlight.js/.*/styles/github.min.css"]="/ext/github.min.css"
  ["https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@.*/build/styles/github-dark.min.css"]="/ext/github-dark.min.css"
  ["https://cdn.jsdelivr.net/npm/highlight.js@[^/]+/styles/github-dark.min.css"]="/ext/github-dark.min.css"
  ["https://cdnjs.cloudflare.com/ajax/libs/highlight.js/.*/styles/github-dark.min.css"]="/ext/github-dark.min.css"
)

# Jalankan penggantian di semua file HTML
find . -type f -name "*.html" | while read -r file; do
  if grep -Eq '\.(js|css)(["'\''\)])' "$file"; then
    BACKUP="${file}.bak"
    cp "$file" "$BACKUP"

    MODIFIED=false

    for pattern in "${!REPLACEMENTS[@]}"; do
      if grep -Eq "$pattern" "$file"; then
        sed -E -i "s|$pattern|${REPLACEMENTS[$pattern]}|g" "$file"
        echo "✅ Mengganti di $file: $pattern → ${REPLACEMENTS[$pattern]}" | tee -a "$LOGFILE"
        MODIFIED=true
      fi
    done

    if [ "$MODIFIED" = true ]; then
      echo "💾 Backup: $BACKUP" >> "$LOGFILE"
      echo "--------------------------------------------" >> "$LOGFILE"
    fi
  fi
done

echo ""
echo "🎉 Proses selesai! Laporan disimpan di: $LOGFILE"
echo "   Backup file tersedia (.bak) di lokasi yang sama."
