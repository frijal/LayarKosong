import json
import os
import re
from datetime import datetime

# Konfigurasi
OUTPUT_DIR = "artikelx"
LOG_DIR = "mini"
LOG_FILE = os.path.join(LOG_DIR, "posted-aggregat.txt")
JSON_FILE = "artikel.json"

def clean_meta_text(text):
    if not text: return ""
    return re.sub(r'[^\w\s\-\.\,]', '', text)

def slugify_category(name):
    name = name.lower()
    name = re.sub(r'\s+', '-', name)
    return re.sub(r'[^\w\-]', '', name)

def get_posted_urls():
    if not os.path.exists(LOG_FILE):
        return set()
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        return set(line.strip() for line in f if line.strip())

def save_posted_urls(urls):
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        for url in urls:
            f.write(f"{url}\n")

def get_semester_range(date):
    """Mengembalikan rentang (start_date, end_date) untuk semester terkait (Naive)."""
    year = date.year
    # Pastikan date di sini adalah naive (tanpa tzinfo)
    date = date.replace(tzinfo=None) 
    
    if date.month <= 6:
        start = datetime(year, 1, 1)
        end = datetime(year, 6, 30, 23, 59, 59)
    else:
        start = datetime(year, 7, 1)
        end = datetime(year, 12, 31, 23, 59, 59)
    return start, end

def build_semester_aggregation():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    if not os.path.exists(JSON_FILE):
        print(f"❌ File {JSON_FILE} tidak ditemukan.")
        return

    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    posted_urls = get_posted_urls()
    all_pending_articles = []

    # 1. Kumpulkan semua artikel yang belum pernah diposting
    for category_raw, articles_list in data.items():
        url_category = slugify_category(category_raw)
        for art in articles_list:
            slug = art[1]
            if slug not in posted_urls:
                date_raw = art[3].replace('Z', '+00:00')
                try:
                    dt = datetime.fromisoformat(date_raw)
                except ValueError:
                    dt = datetime.strptime(date_raw[:19], '%Y-%m-%dT%H:%M:%S')
                    dt = dt.replace(tzinfo=None)

                all_pending_articles.append({
                    'title': art[0],
                    'slug': slug,
                    'thumb': art[2],
                    'date': dt,
                    'date_raw': art[3],
                    'content': art[4],
                    'category_name': category_raw,
                    'category_slug': url_category
                })

    if not all_pending_articles:
        print("☕ Tidak ada artikel baru untuk diproses.")
        return

    # Urutkan berdasarkan tanggal (terlama ke terbaru)
    all_pending_articles.sort(key=lambda x: x['date'])
    
    now = datetime.now()

    # 2. PROSES LOOPING PER SEMESTER
    while all_pending_articles:
        # Ambil rentang semester dari artikel tertua yang tersedia
        start_date, end_date = get_semester_range(all_pending_articles[0]['date'])
        
        # JANGAN BUAT jika sekarang belum melewati batas akhir semester tersebut
        if now <= end_date:
            print(f"⏳ Semester {start_date.strftime('%Y-%m')} belum berakhir (Batas: {end_date.strftime('%d %B %Y')}). Menunggu...")
            break

        # Ambil semua artikel yang masuk dalam rentang semester ini
        current_batch = [a for a in all_pending_articles if start_date <= a['date'] <= end_date]
        
        if not current_batch:
            all_pending_articles.pop(0)
            continue

        label_semester = "Semester 1" if start_date.month == 1 else "Semester 2"
        file_name = f"agregat-{start_date.year}-{label_semester.replace(' ', '').lower()}.html"
        page_url = f"https://dalam.web.id/artikel/{file_name}"
        main_cover = current_batch[0]['thumb']
        first_date_iso = current_batch[0]['date'].isoformat()

        articles_html = ""
        batch_slugs = []

        for a in current_batch:
            clean_slug = a['slug'].replace('.html', '')
            base_link = f"https://dalam.web.id/{a['category_slug']}/{clean_slug}"
            articles_html += f"""
            <section class="article-block">
                <div class="meta">
                    <i class="fa-solid fa-folder-open"></i> {a['category_name']} |
                    <i class="fa-solid fa-calendar"></i> {a['date_raw']}
                </div>
                <h2><a href="{base_link}" style="text-decoration: none;">{a['title']}</a></h2>
                <a href="{base_link}"><img src="{a['thumb']}" alt="{clean_meta_text(a['title'])}" class="main-img" loading="lazy"></a>
                <div class="content">{a['content']}</div>
                <p><a href="{base_link}" class="read-more">Baca selengkapnya di {a['category_name']} &rarr;</a></p>
                <hr class="separator">
            </section>
            """
            batch_slugs.append(a['slug'])

        # Susun template HTML
        full_html = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arsip Layar Kosong: {label_semester} {start_date.year}</title>
    <meta name="description" content="Kumpulan artikel blog Layar Kosong periode {start_date.strftime('%B')} - {end_date.strftime('%B')} {start_date.year}.">
    <link rel="canonical" href="{page_url}">
    <meta property="og:image" content="{main_cover}">
    <link rel="stylesheet" href="/ext/fontawesome.css">
    <style>
        :root {{ --bg: #ffffff; --text: #1a1a1a; --accent: #d70a53; --card: #f8f9fa; }}
        @media (prefers-color-scheme: dark) {{ :root {{ --bg: #0d1117; --text: #c9d1d9; --accent: #58a6ff; --card: #161b22; }} }}
        body {{ font-family: 'Inter', sans-serif; line-height: 1.8; background: var(--bg); color: var(--text); padding: 20px; display: flex; justify-content: center; }}
        .container {{ width: 100%; max-width: 1000px; }}
        header {{ text-align: center; border-bottom: 5px solid var(--accent); padding-bottom: 30px; margin-bottom: 50px; }}
        .main-img {{ width: 100%; border-radius: 12px; margin: 20px 0; }}
        .meta {{ font-size: 0.85rem; opacity: 0.6; font-weight: bold; }}
        h2 {{ color: var(--accent); }}
        .separator {{ border: 0; border-top: 1px dashed #444; margin: 50px 0; }}
        footer {{ text-align: center; margin-top: 80px; padding: 40px 0; border-top: 1px solid #333; }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Arsip {label_semester} ({start_date.year})</h1>
            <p>Periode: {start_date.strftime('%d %b')} s/d {end_date.strftime('%d %b %Y')}</p>
        </header>
        {articles_html}
        <footer>
            <p>Dihasilkan secara otomatis oleh sistem kurasi Frijal | Balikpapan</p>
            <p><a href="https://dalam.web.id" style="color:var(--accent); text-decoration:none;">Layar Kosong</a></p>
        </footer>
    </div>
</body>
</html>"""

        # Simpan file
        output_path = os.path.join(OUTPUT_DIR, file_name)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_html)

        # Catat slug agar tidak diproses lagi
        save_posted_urls(batch_slugs)
        print(f"✅ File '{file_name}' dibuat ({len(current_batch)} artikel).")

        # Hapus yang sudah diproses dari list pending
        all_pending_articles = [a for a in all_pending_articles if a['slug'] not in batch_slugs]

    print("\n✨ Proses selesai!")

if __name__ == "__main__":
    build_semester_aggregation()
