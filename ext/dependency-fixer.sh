#!/bin/bash

echo "🚀 Memulai Operasi Dependency Fixer Spesifik..."

if [ -f package.json ]; then
    # 1. Paksa upgrade fetch-blob ke versi terbaru (siapa tahu mereka sudah buang domexception)
    echo "🆙 Mencoba upgrade fetch-blob secara manual..."
    npm install fetch-blob@latest --save || true

    # 2. Re-install node-fetch untuk sinkronisasi
    echo "🆙 Refreshing node-fetch..."
    npm install node-fetch@latest --save

    # 3. Gunakan NPM Overrides (Fitur ampuh NPM v8+)
    # Ini akan memaksa semua paket yang minta node-domexception untuk diam (atau diabaikan)
    echo "🛠️ Menerapkan overrides pada package.json..."
    npx npm-add-override node-domexception@1.0.0 "node-domexception@npm:empty-package" || echo "Manual override needed"

    # 4. Bersihkan sisa-sisa
    echo "🧹 Cleanup..."
    npm prune
    npm audit fix
    
    echo "✨ Selesai! Coba cek audit lagi nanti."
else
    echo "❌ package.json tidak ada."
    exit 1
fi
