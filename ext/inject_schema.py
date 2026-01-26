import json
import os
import re

# ======================================================
# KONFIGURASI GLOBAL (V6.9 READY)
# ======================================================
BASE_URL = "https://dalam.web.id"
SITE_NAME = "Layar Kosong"
AUTHOR = "Fakhrul Rijal"
LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/"

LOGO_URL = f"{BASE_URL}/logo.png"
WEBSITE_ID = f"{BASE_URL}/#website"
ORG_ID = f"{BASE_URL}/#organization"

HASH_FILE = "mini/LD-JSON-Schema.txt"
os.makedirs("mini", exist_ok=True)

SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

# ======================================================
# UTILITIES
# ======================================================
def slugify(text: str) -> str:
    return text.strip().lower().replace(" ", "-")

def category_name_clean(category: str) -> str:
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
# SINGLE SCHEMA BUILDER (WITH FULL URL LOGIC)
# ======================================================
def build_combined_schema(category, article):
    headline, filename, image, iso_date, desc = article

    cat_slug = slugify(category)
    file_slug = filename.replace('.html', '').lstrip('/')

    # Membangun Full URL
    article_url = f"{BASE_URL}/{cat_slug}/{file_slug}/"

    cat_display_name = category_name_clean(category)
    category_url = f"{BASE_URL}/{cat_slug}/"
    keywords = build_keywords(headline, cat_display_name, file_slug)

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
                "license": LICENSE_URL,
                "headline": headline,
                "description": desc,
                "articleSection": cat_display_name,
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
                    {"@type": "ListItem", "position": 2, "name": cat_display_name, "item": category_url},
                    {"@type": "ListItem", "position": 3, "name": headline, "item": article_url}
                ]
            }
        ]
    }

    return (
        '<script type="application/ld+json">'
        + json.dumps(schema_data, ensure_ascii=False, separators=(",", ":"))
        + "</script>\n",
        article_url # Mengembalikan URL juga untuk dicatat
    )

# ======================================================
# EKSEKUSI UTAMA (MODIFIED FOR FULL URL TRACKING)
# ======================================================
if __name__ == "__main__":
    if not os.path.exists("artikel.json"):
        print("❌ File artikel.json tidak ditemukan!")
        exit()

    with open("artikel.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # Load progress (Sekarang memuat Full URL dari HASH_FILE)
    processed_urls = set()
    if os.path.isfile(HASH_FILE):
        with open(HASH_FILE, "r", encoding="utf-8") as f:
            for line in f:
                processed_urls.add(line.strip())

    new_urls_to_save = []
    changed_files = 0
    skipped_files = 0

    for category, articles in data.items():
        cat_slug = slugify(category)

        for article in articles:
            filename = article[1]
            file_slug = filename.replace('.html', '').lstrip('/')

            # Membangun URL untuk pengecekan awal
            current_article_url = f"{BASE_URL}/{cat_slug}/{file_slug}/"

            # Cek apakah Full URL sudah pernah diproses
            if current_article_url in processed_urls:
                skipped_files += 1
                continue

            html_path = os.path.join(cat_slug, filename.lstrip('/'))

            if not os.path.isfile(html_path):
                html_path = filename if os.path.isfile(filename) else html_path
                if not os.path.isfile(html_path):
                    continue

            print(f"🧠 Injecting Schema: {current_article_url}")

            with open(html_path, "r", encoding="utf-8") as f:
                original_html = f.read()

            html_clean = re.sub(SCHEMA_REGEX, "", original_html)

            # Dapatkan kode injeksi dan konfirmasi URL
            inject_code, confirmed_url = build_combined_schema(category, article)

            if "</head>" not in html_clean:
                continue

            new_html = html_clean.replace("</head>", inject_code + "</head>")

            with open(html_path, "w", encoding="utf-8") as f:
                f.write(new_html)

            new_urls_to_save.append(confirmed_url)
            changed_files += 1

    # Update HASH_FILE dengan Full URL
    if new_urls_to_save:
        with open(HASH_FILE, "a", encoding="utf-8") as f:
            for url in new_urls_to_save:
                f.write(url + "\n")

    print("-" * 50)
    print(f"✅ Schema V6.9 Injected with Full URL Tracking!")
    print(f"🆕 Baru (URL Dicatat) : {changed_files}")
    print(f"⏭️ Skip (URL Ada)     : {skipped_files}")
    print("-" * 50)
