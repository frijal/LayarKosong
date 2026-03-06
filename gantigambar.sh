# 1. Cari file yang mengandung thumbnail.webp di meta tag
grep -l "thumbnail.webp" artikel/*.html | while read -r filepath; do
    
    # Ambil nama file tanpa path (contoh: artikel-saya.html)
    filename=$(basename "$filepath")
    # Ambil nama dasar file (contoh: artikel-saya)
    basename="${filename%.html}"
    
    # 2. Cek apakah ada file gambar yang sesuai di folder img/
    if [ -f "img/$basename.webp" ]; then
        echo "✅ Ditemukan: $filename -> Mengganti ke img/$basename.webp"
        
        # 3. Lakukan penggantian menggunakan Perl
        # Kita targetkan 3 meta tag spesifik tersebut
        perl -i -pe '
            s|(<meta itemprop="image" content=").*(".*)|${1}https://dalam.web.id/img/'"$basename"'.webp"|g;
            s|(<meta name="twitter:image" content=").*(".*)|${1}https://dalam.web.id/img/'"$basename"'.webp"|g;
            s|(<meta property="twitter:image" content=").*(".*)|${1}https://dalam.web.id/img/'"$basename"'.webp"|g;
        ' "$filepath"
        
        # 4. Ganti property og:image secara terpisah jika perlu
        perl -i -pe 's|(<meta property="og:image" content=").*(".*)|${1}https://dalam.web.id/img/'"$basename"'.webp"|g' "$filepath"
        
    else
        echo "⚠️ Gambar tidak ditemukan untuk: $filename"
    fi
done
