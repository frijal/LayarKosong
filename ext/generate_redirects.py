import json
import re

# Konfigurasi
SOURCE_JSON = 'artikel.json'
OUTPUT_FILE = '_redirects2'
BASE_URL = 'https://dalam.web.id'

def slugify(text):
    # Trimming dan ubah spasi jadi tanda hubung
    text = text.strip().lower()
    text = re.sub(r'\s+', '-', text)
    return text

def generate_redirects():
    try:
        # 1. Buka file JSON
        with open(SOURCE_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)

        lines = []
        lines.append(f"# Redirects Full URL Layar Kosong V6.9")
        lines.append(f"# Generated for: {BASE_URL}\n")

        for category, articles in data.items():
            cat_slug = slugify(category)

            for article in articles:
                # Format artikel: [Judul, NamaFile, Gambar, Tanggal, Deskripsi]
                file_name = article[1].strip()
                file_slug = file_name.replace('.html', '')
                
                # Full Target URL
                target_url = f"{BASE_URL}/{cat_slug}/{file_slug}/"

                # Full Source URL (Tanpa .html)
                source_full_clean = f"{BASE_URL}/artikel/{file_slug}"
                lines.append(f"{source_full_clean}  {target_url}  301")

                # Full Source URL (Dengan .html)
                source_full_html = f"{BASE_URL}/artikel/{file_name}"
                lines.append(f"{source_full_html}  {target_url}  301")

        # 2. Tulis ke file _redirects
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))

        print(f"✅ Berhasil, Mas! File {OUTPUT_FILE} sudah Full URL.")
        print(f"📊 Total: {len(lines) - 3} baris siap tempur.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    generate_redirects()
