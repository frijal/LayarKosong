for file in artikel/*.html; do
    # Ambil nama file tanpa ekstensi (.html)
    basename=$(basename "$file" .html)

    # Periksa apakah gambar yang sesuai ada di folder img/
    if [ -f "img/$basename.webp" ]; then
        echo "🔄 Memproses: $file -> menggunakan $basename.webp"

        # Gunakan Perl dengan mode slurp (-0777) agar bisa membaca seluruh isi file sekaligus
        # Ini akan mengganti semua kemunculan thumbnail.webp dengan nama file yang spesifik
        # Gunakan env variable agar lebih aman dari karakter aneh
BASENAME="$basename" perl -i -0777 -pe 's|https://dalam.web.id/thumbnail\.webp|"https://dalam.web.id/img/" . $ENV{BASENAME} . ".webp"|ge' "$file"
    else
        echo "⚠️ Gambar img/$basename.webp tidak ditemukan, dilewati."
    fi
done
