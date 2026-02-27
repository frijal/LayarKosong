#!/bin/bash
set -e

echo "🧹 Dependency Sanitizer (CI-safe, lockfile-aware)"

if [ ! -f package.json ]; then
  echo "❌ package.json tidak ditemukan."
  exit 1
fi

# ----------------------------
# 1. Daftar legacy package
# ----------------------------
LEGACY_PKGS=(
  node-fetch
  fetch-blob
  node-domexception
)

echo "🔎 Memeriksa legacy dependencies..."

FOUND=0
for pkg in "${LEGACY_PKGS[@]}"; do
  if npm ls "$pkg" >/dev/null 2>&1; then
    echo "⚠️  Ditemukan: $pkg"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "✅ Tidak ada legacy dependency terdeteksi."
  exit 0
fi

# ----------------------------
# 2. Hapus dari node_modules saja
# ----------------------------
echo "🧼 Menghapus legacy dependency dari node_modules..."
rm -rf node_modules/node-fetch \
       node_modules/fetch-blob \
       node_modules/node-domexception || true

# ----------------------------
# 3. Re-install SESUAI lockfile
# ----------------------------
echo "📦 Re-sync dependency tree (lockfile-aware)..."

if [ -f package-lock.json ]; then
  npm ci --no-audit
else
  npm install --no-audit
fi

echo "✨ Sanitasi dependency selesai dengan aman."
