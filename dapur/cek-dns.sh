#!/bin/bash

DOMAIN="dalam.web.id"
RESOLVER="@1.1.1.1" # Tembak langsung ke Cloudflare

echo -e "\n🔍 Mengecek status DNS untuk $DOMAIN..."
echo "========================================"

echo "📦 MX Records:"
dig +short MX $DOMAIN $RESOLVER | sort -n
if [ -z "$(dig +short MX $DOMAIN $RESOLVER)" ]; then
    echo "   ❌ Belum propagasi"
fi

echo -e "\n🛡️ SPF Record:"
dig +short TXT $DOMAIN $RESOLVER | grep "v=spf1"
if [ $? -ne 0 ]; then
    echo "   ❌ Belum propagasi"
fi

echo -e "\n🔐 DMARC Record:"
dig +short TXT _dmarc.$DOMAIN $RESOLVER | grep "v=DMARC1"
if [ $? -ne 0 ]; then
    echo "   ❌ Belum propagasi"
fi

echo "========================================"
echo "✨ Selesai!"
echo ""
