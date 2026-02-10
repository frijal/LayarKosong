import json
import re

# Konfigurasi
SOURCE_JSON = 'artikel.json'
OUTPUT_FILE = '_redirects2'

def slugify(text):
    # Trimming dan ubah spasi jadi tanda hubung tunggal
    text = text.strip().lower()
    text = re.sub(r'\s+', '-', text)
    return text

def generate_redirects():
    try:
        # 1. Buka file JSON
        with open(SOURCE_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)

        lines = []
        # Tambahkan header komentar (opsional, Cloudflare tetap bisa baca)
        lines.append("# Redirects Relative Path Layar Kosong V6.9\n")

        for category, articles in data.items():
            cat_slug = slugify(category)

            for article in articles:
                # Ambil nama file dan bersihkan spasi
                file_name = article[1].strip()
                file_slug = file_name.replace('.html', '')
                
                # Path Target Baru
                target_path = f"/{cat_slug}/{file_slug}"

                # Path Lama 1: Tanpa .html
                source_clean = f"/artikel/{file_slug}"
                # Format: /lama /baru 301 (dipisahkan spasi/tab)
                lines.append(f"{source_clean}  {target_path}  301")

                # Path Lama 2: Dengan .html
                source_html = f"/artikel/{file_name}"
                lines.append(f"{source_html}  {target_path}  301")

        # 2. Tulis ke file _redirects
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

        print(f"✅ Selesai! File {OUTPUT_FILE} sudah siap dengan Relative Path.")
        print(f"📊 Total baris: {len(lines) - 1}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    generate_redirects()
