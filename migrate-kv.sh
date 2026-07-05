#!/bin/bash

# ID KV aslimu
KV_ID="5c5197918fee41a0b79f4212c00a7552"

echo "🚀 Memulai panen data dari KV (Jalur Lokal)..."
> migrasi.sql # Kosongkan/buat file SQL

# Ambil daftar keys pakai trik grep-mu
KEYS=$(bunx wrangler kv key list --namespace-id="$KV_ID" --remote | grep -o '"name": "[^"]*' | grep -o '[^"]*$')

for key in $KEYS; do
  echo "⏳ Membaca data: $key"
  VAL=$(bunx wrangler kv key get --namespace-id="$KV_ID" --remote "$key")
  
  # Parsing angka v dan t
  V=$(echo "$VAL" | grep -Po '"v":\s*\K[0-9]+' || echo 0)
  T=$(echo "$VAL" | grep -Po '"t":\s*\K[0-9]+' || echo 1)
  
  # Jika format data lama berupa angka polos (bukan JSON)
  if [ "$V" -eq 0 ] && [[ "$VAL" =~ ^[0-9]+$ ]]; then
    V=$VAL
  fi
  
  # Bersihkan 'view:'
  CLEAN_PATH=$(echo "$key" | sed 's/^view://')
  
  # Tulis ke file
  echo "INSERT INTO page_stats (path, views, visitors) VALUES ('$CLEAN_PATH', $V, $T) ON CONFLICT(path) DO UPDATE SET views = views + excluded.views, visitors = visitors + excluded.visitors;" >> migrasi.sql
done

echo "✅ Selesai! File migrasi.sql berhasil dicetak."
