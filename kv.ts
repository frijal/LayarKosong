# 1. Definisikan ID KV Namespace kamu di sini
KV_ID="5c5197918fee41a0b79f4212c00a7552"

# 2. Daftar folder sampah yang akan dihapus massal berdasarkan prefix
prefixes=(
  "view:/b_dt2/"
  "view:/c_dt2/"
  "view:/d1/"
  "view:/de1/"
  "view:/enc1/"
  "view:/enc3/"
  "view:/g1/"
)

echo "=== 🧹 MEMULAI PEMBERSIHAN PREFIX FOLDER GAMBUT ==="
for prefix in "${prefixes[@]}"; do
    echo "Sedang menyapu prefix: $prefix ..."
    bunx wrangler kv key list --namespace-id="$KV_ID" --prefix="$prefix" | grep -o '"name": "[^"]*' | grep -o '[^"]*$' | xargs -I {} bunx wrangler kv key delete --namespace-id="$KV_ID" "{}"
done

# 3. Daftar key tunggal spesifik yang tidak masuk ke prefix folder di atas
exact_keys=(
  "view:/57f49ea8-2d88-4cf3-94bc-83b4a65ec584"
  "view:/_a.php"
  "view:/_f.php"
)

echo "=== 🎯 MEMULAI PEMBERSIHAN KEY SPESIFIK TUNGGAL ==="
for key in "${exact_keys[@]}"; do
    echo "Menghapus key tunggal: $key ..."
    bunx wrangler kv key delete --namespace-id="$KV_ID" "$key"
done

echo "=== 🎉 SEMUA SAMPAH BOT SUDAH BERSIH TOTAL! ==="
