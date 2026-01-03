import json
import os
import re

# ======================================================
# KONFIGURASI GLOBAL
# ======================================================
BASE_URL = "https://dalam.web.id"
SITE_NAME = "Layar Kosong"
AUTHOR = "Fakhrul Rijal"

LOGO_URL = f"{BASE_URL}/logo.png"
WEBSITE_ID = f"{BASE_URL}/#website"
ORG_ID = f"{BASE_URL}/#organization"

HASH_FILE = "mini/LD-JSON-Schema.txt"
os.makedirs("mini", exist_ok=True)

# ======================================================
# REGEX HAPUS SEMUA SCHEMA EXISTING (BIAR BERSIH)
# ======================================================
SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

# ======================================================
# UTILITIES
# ======================================================
def strip_html(filename: str) -> str:
    """Menghapus ekstensi .html untuk slug dan Clean URL"""
    return filename[:-5] if filename.endswith(".html") else filename

def category_slug(category: str) -> str:
    return category.strip().lower().replace(" ", "-")

def category_name(category: str) -> str:
    return category.strip().replace("-", " ").title()

def build_keywords(headline: str, category: str, slug: str) -> str:
    base = set()
    for part in re.split(r"[^\w]+", headline.lower()):
        if len(part) > 3:
            base.add(part)
    base.add(category.lower())
    base.update(slug.replace("-", " ").split())
    base.add("layar kosong")
    return ", ".join(sorted(base))

# ======================================================
# SINGLE SCHEMA BUILDER (COMBINED @GRAPH)
# ======================================================
def build_combined_schema(category, article):
    headline, filename, image, iso_date, desc = article
    
    # 👉 PEMBERSIHAN URL: Menghasilkan Clean URL tanpa .html
    slug = strip_html(filename)
    article_url = f"{BASE_URL}/artikel/{slug}"
    
    cat_slug = category_slug(category)
    cat_name = category_name(category)
    category_url = f"{BASE_URL}/artikel/-/{cat_slug}/"
    keywords = build_keywords(headline, cat_name, slug)

    schema_data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": WEBSITE_ID,
                "url": BASE_URL + "/",
                "name": SITE_NAME,
                "publisher": {
                    "@type": "Organization",
                    "@id": ORG_ID,
                    "name": SITE_NAME,
                    "url": BASE_URL,
                    "logo": {
                        "@type": "ImageObject",
                        "url": LOGO_URL,
                        "width": 384,
                        "height": 384
                    }
                }
            },
            {
                "@type": "Article",
                "@id": f"{article_url}#article",
                "isPartOf": {"@id": WEBSITE_ID},
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": article_url
                },
                "headline": headline,
                "description": desc,
                "articleSection": cat_name,
                "keywords": keywords,
                "image": {
                    "@type": "ImageObject",
                    "url": image,
                    "width": 1200,
                    "height": 675
                },
                "author": {
                    "@type": "Person",
                    "name": AUTHOR,
                    "url": f"{BASE_URL}/about"
                },
                "publisher": {"@id": ORG_ID},
                "datePublished": iso_date,
                "dateModified": iso_date
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{article_url}#breadcrumb",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Beranda", "item": BASE_URL + "/"},
                    {"@type": "ListItem", "position": 2, "name": cat_name, "item": category_url},
                    {"@type": "ListItem", "position": 3, "name": headline, "item": article_url}
                ]
            }
        ]
    }

    return (
        '<script type="application/ld+json">'
        + json.dumps(schema_data, ensure_ascii=False, separators=(",", ":"))
        + "</script>\n"
    )

# ======================================================
# EKSEKUSI UTAMA
# ======================================================
if __name__ == "__main__":
    if not os.path.exists("artikel.json"):
        print("❌ File artikel.json tidak ditemukan!")
        exit()

    with open("artikel.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # 2. Load progress (Incremental)
    processed_urls = set()
    if os.path.isfile(HASH_FILE):
        with open(HASH_FILE, "r", encoding="utf-8") as f:
            for line in f:
                processed_urls.add(line.strip())

    new_urls_ordered = [] # Pake list biar urutan pengerjaan terjaga
    changed_files = 0
    skipped_files = 0

    # 3. Proses File
    for category, articles in data.items():
        for article in articles:
            filename = article[1]
            html_path = os.path.join("artikel", filename)

            if not os.path.isfile(html_path):
                continue

            # 👉 URL DISINI SUDAH BERSIH DARI .HTML
            slug = strip_html(filename)
            article_url = f"{BASE_URL}/artikel/{slug}"

            # Cek apakah sudah diproses sebelumnya (menggunakan URL bersih)
            if article_url in processed_urls:
                skipped_files += 1
                continue

            with open(html_path, "r", encoding="utf-8") as f:
                original_html = f.read()

            # Langkah 1: Bersihkan semua schema ld+json lama
            html_clean = re.sub(SCHEMA_REGEX, "", original_html)

            # Langkah 2: Build schema baru (sudah gabungan)
            inject_code = build_combined_schema(category, article)

            if "</head>" not in html_clean:
                print(f"⚠️ Tag </head> tidak ditemukan di {filename}")
                continue

            # Langkah 3: Masukkan tepat sebelum </head>
            new_html = html_clean.replace("</head>", inject_code + "</head>")

            with open(html_path, "w", encoding="utf-8") as f:
                f.write(new_html)

            new_urls_ordered.append(article_url)
            changed_files += 1

    # ======================================================
    # 4. UPDATE FILE URL (APPEND MODE - TERBARU DI BAWAH)
    # ======================================================
    if new_urls_ordered:
        with open(HASH_FILE, "a", encoding="utf-8") as f:
            for url in new_urls_ordered:
                f.write(url + "\n")

    print("-" * 30)
    print(f"✅ Tugas Selesai di Balikpapan!")
    print(f"🆕 Artikel baru diproses : {changed_files}")
    print(f"⏭️ Artikel dilewati      : {skipped_files}")
    print(f"📝 Cek daftar terbaru di bagian bawah {HASH_FILE}")
    print("-" * 30)
