import json
import os
import re
from datetime import datetime, timedelta

# Konfigurasi
OUTPUT_DIR = "artikelx"
LOG_DIR = "mini"
LOG_FILE = os.path.join(LOG_DIR, "posted-aggregat.txt")
JSON_FILE = "artikel.json"

def clean_meta_text(text):
    if not text: return ""
    # Menghapus simbol yang berpotensi merusak meta tag
    return re.sub(r'[^\w\s\-\.\,]', '', text)

def slugify_category(name):
    """Mengubah 'Warta Tekno' menjadi 'warta-tekno' agar URL aman"""
    name = name.lower()
    name = re.sub(r'\s+', '-', name) # Ganti spasi dengan dash
    return re.sub(r'[^\w\-]', '', name) # Hapus karakter non-alfanumerik kecuali dash

def get_posted_urls():
    """Membaca daftar URL yang sudah pernah diposting dari database mini"""
    if not os.path.exists(LOG_FILE):
        return set()
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f if line.strip())

def save_posted_urls(urls):
    """Mencatat URL baru ke database mini agar tidak duplikasi"""
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        for url in urls:
            f.write(f"{url}\n")

def get_monday(date):
    """Mencari hari Senin sebagai acuan awal minggu (Monday start)"""
    return (date - timedelta(days=date.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

def build_weekly_aggregation():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 1. Baca data JSON
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    posted_urls = get_posted_urls()
    all_pending_articles = []

    # 2. Loop melalui setiap KATEGORI (Key di JSON)
    for category_raw, articles_list in data.items():
        # "Warta Tekno" -> "warta-tekno"
        url_category = slugify_category(category_raw)
        
        for art in articles_list:
            slug = art[1]
            if slug not in posted_urls:
                # Normalisasi format tanggal sumber
                date_raw = art[3].replace('Z', '+00:00')
                try:
                    dt = datetime.fromisoformat(date_raw)
                except ValueError:
                    dt = datetime.strptime(date_raw[:19], '%Y-%m-%dT%H:%M:%S')
                
                all_pending_articles.append({
                    'title': art[0],
                    'slug': slug,
                    'thumb': art[2],
                    'date': dt,
                    'date_raw': art[3],
                    'content': art[4],
                    'category_name': category_raw, # Nama asli buat label
                    'category_slug': url_category  # Nama slug buat URL folder
                })

    if not all_pending_articles:
        print("☕ Semua artikel di JSON sudah habis diposting. Chill dulu!")
        return

    # 3. Urutkan dari yang paling tua
    all_pending_articles.sort(key=lambda x: x['date'])

    # 4. Tentukan Rentang Minggu (Senin s/d Minggu) berdasarkan artikel tertua
    start_monday = get_monday(all_pending_articles[0]['date'])
    end_sunday = start_monday + timedelta(days=6, hours=23, minutes=59, seconds=59)

    # 5. Ambil semua artikel yang jatuh di minggu yang sama
    current_batch = [a for a in all_pending_articles if start_monday <= a['date'] <= end_sunday]
    
    if not current_batch:
        print(f"⚠️ Batch kosong untuk rentang {start_monday.date()}")
        return

    # 6. Penamaan File berdasarkan Tanggal Senin di minggu tersebut
    monday_str = start_monday.strftime('%Y-%m-%d')
    file_name = f"agregat-{monday_str}.html"
    
    articles_html = ""
    batch_slugs = []

    for a in current_batch:
        # Perbaikan URL: Mengarahkan ke folder kategori yang tepat
        base_link = f"https://dalam.web.id/{a['category_slug']}/{a['slug']}"
        
        articles_html += f"""
        <section class="article-block">
            <div class="meta">
                <i class="fa-solid fa-folder-open"></i> {a['category_name']} | 
                <i class="fa-solid fa-calendar"></i> {a['date_raw']}
            </div>
            <h2>{a['title']}</h2>
            <img src="{a['thumb']}" alt="{clean_meta_text(a['title'])}" class="main-img" loading="lazy" width="100%" height="auto">
            <div class="content">{a['content']}</div>
            <p><a href="{base_link}" class="read-more">Baca selengkapnya di {a['category_name']} &rarr;</a></p>
            <hr class="separator">
        </section>
        """
        batch_slugs.append(a['slug'])

    # 7. Template HTML SEO & E-E-A-T Friendly
    full_html = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kumpulan Tulisan Layar Kosong: Edisi {monday_str} | Arsip</title>
    <meta name="description" content="Agregasi mingguan artikel blog Layar Kosong periode {monday_str}. Menyajikan konten lawas dan baru secara sistematis.">
    <link rel="canonical" href="https://dalam.web.id/artikel/{file_name}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root {{ --bg: #ffffff; --text: #1a1a1a; --accent: #d70a53; --card: #f8f9fa; }}
        @media (prefers-color-scheme: dark) {{ :root {{ --bg: #0d1117; --text: #c9d1d9; --accent: #58a6ff; --card: #161b22; }} }}
        body {{ font-family: 'Inter', -apple-system, sans-serif; line-height: 1.8; background: var(--bg); color: var(--text); margin: 0; padding: 20px; display: flex; justify-content: center; }}
        .container {{ width: 100%; max-width: 1000px; }}
        header {{ text-align: center; border-bottom: 5px solid var(--accent); padding-bottom: 30px; margin-bottom: 50px; }}
        .article-block {{ margin-bottom: 70px; }}
        h1 {{ font-size: 2.3rem; margin-bottom: 10px; }}
        h2 {{ font-size: 1.9rem; color: var(--accent); margin-top: 5px; }}
        .main-img {{ width: 100%; height: auto; border-radius: 12px; margin: 20px 0; content-visibility: auto; }}
        .meta {{ font-size: 0.85rem; opacity: 0.6; font-weight: bold; }}
        .separator {{ border: 0; border-top: 1px dashed #444; margin: 50px 0; }}
        .read-more {{ font-weight: bold; color: var(--accent); text-decoration: none; border-bottom: 2px solid transparent; transition: 0.3s; }}
        .read-more:hover {{ border-bottom: 2px solid var(--accent); }}
        footer {{ text-align: center; margin-top: 80px; padding: 40px 0; border-top: 1px solid #333; font-size: 0.9rem; opacity: 0.7; }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Agregasi Mingguan 🗞️</h1>
            <p><strong>Arsip Edisi:</strong> {monday_str} s/d {end_sunday.strftime('%Y-%m-%d')}</p>
        </header>
        
        {articles_html}

        <footer>
            <p>Dihasilkan secara otomatis oleh sistem kurasi Frijal | Balikpapan</p>
            <p>&copy; 2026 <a href="https://dalam.web.id" style="color:var(--accent); text-decoration:none;">Layar Kosong</a></p>
        </footer>
    </div>
</body>
</html>"""

    # 8. Simpan File & Log
    output_path = os.path.join(OUTPUT_DIR, file_name)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_html)
    
    save_posted_urls(batch_slugs)
    
    print(f"✨ Berhasil! File '{file_name}' telah dibuat.")
    print(f"📦 Batch ini mencakup {len(batch_slugs)} artikel dari kategori terkait.")

if __name__ == "__main__":
    build_weekly_aggregation()
