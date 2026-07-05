#!/bin/sh

# 1. ID KV Namespace asli dari log terminalmu
KV_ID="5c5197918fee41a0b79f4212c00a7552"

# 2. Daftar folder sampah
prefixes="view:/b_dt2/ view:/c_dt2/ view:/d1/ view:/de1/ view:/enc1/ view:/enc3/ view:/g1/"

echo "=== 🧹 MEMULAI PEMBERSIHAN PREFIX LIVE DI CLOUDFLARE PRODUCTION ==="
for prefix in $prefixes; do
    echo "Sedang menyapu prefix: $prefix ..."
    # Ditambahkan --remote di baris list dan delete
    bunx wrangler kv key list --namespace-id="$KV_ID" --prefix="$prefix" --remote | grep -o '"name": "[^"]*' | grep -o '[^"]*$' | xargs -I {} bunx wrangler kv key delete --namespace-id="$KV_ID" --remote "{}"
done

# 3. Daftar key tunggal spesifik
exact_keys="view:/57f49ea8-2d88-4cf3-94bc-83b4a65ec584 view:/_a.php view:/_f.php"

echo "=== 🎯 MEMULAI PEMBERSIHAN KEY SPESIFIK TUNGGAL LIVE ==="
for key in $exact_keys; do
    echo "Menghapus key tunggal: $key ..."
    # Ditambahkan --remote di baris delete tunggal
    bunx wrangler kv key delete --namespace-id="$KV_ID" --remote "$key"
done

echo "=== 🎉 BUMI HANGUS SELESAI! SEMUA SAMPAH DI DASHBOARD REAL BERSIH TOTAL! ==="
