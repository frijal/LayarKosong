import json
import os
import re
import hashlib
from datetime import datetime, UTC

# ======================================================
# KONFIGURASI GLOBAL
# ======================================================
BASE_URL = "https://dalam.web.id"
SITE_NAME = "Layar Kosong"
AUTHOR = "Fakhrul Rijal"
LOGO_URL = f"{BASE_URL}/logo.png"
WEBSITE_ID = f"{BASE_URL}/#website"

HASH_FILE = "mini/LD-JSON-Schema.txt"
os.makedirs("mini", exist_ok=True)

# ======================================================
# REGEX HAPUS SEMUA SCHEMA EXISTING
# ======================================================
SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

# ======================================================
# LOAD HASH CACHE
# ======================================================
existing_hashes = set()
if os.path.isfile(HASH_FILE):
    with open(HASH_FILE, "r", encoding="utf-8") as f:
        existing_hashes = {line.strip() for line in f if line.strip()}

new_hashes = set()

# ======================================================
# UTILITIES
# ======================================================
def category_slug(category: str) -> str:
    """Slug URL kategori: lowercase + spasi -> dash"""
    return category.strip().lower().replace(" ", "-")

def category_name(category: str) -> str:
    """Nama kategori untuk breadcrumb: Title Case"""
    return category.strip().replace("-", " ").title()

def hash_article(url: str, title: str) -> str:
    """Hash stabil: URL asli + judul lowercase"""
    raw = f"{url.strip()}|{title.strip().lower()}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()

# ======================================================
# SCHEMA BUILDERS (MINIFIED)
# ======================================================
def build_website_schema():
    return (
        '<script type="application/ld+json">'
        + json.dumps({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": WEBSITE_ID,
            "url": BASE_URL + "/",
            "name": SITE_NAME,
            "publisher": {
                "@type": "Organization",
                "name": SITE_NAME,
                "logo": {
                    "@type": "ImageObject",
                    "url": LOGO_URL,
                    "width": 384,
                    "height": 384
                }
            }
        }, separators=(",", ":"))
        + "</script>\n"
    )

def build_article_schema(category, article):
    headline, filename, image, date_pub, desc = article

    # slug artikel TIDAK diubah
    article_url = f"{BASE_URL}/artikel/{filename}"

    # kategori: slug vs nama DIPISAH
    cat_slug = category_slug(category)
    cat_name = category_name(category)
    category_url = f"{BASE_URL}/artikel/-/{cat_slug}/"

    now_utc = datetime.now(UTC).strftime("%Y-%m-%d")

    return (
        '<script type="application/ld+json">'
        + json.dumps({
            "@context": "https://schema.org",
            "@graph": [
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
                    "image": {
                        "@type": "ImageObject",
                        "url": image,
                        "width": 1200,
                        "height": 675
                    },
                    "author": {
                        "@type": "Person",
                        "name": AUTHOR
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": SITE_NAME,
                        "url": BASE_URL,
                        "logo": {
                            "@type": "ImageObject",
                            "url": LOGO_URL,
                            "width": 384,
                            "height": 384
                        }
                    },
                    "datePublished": date_pub,
                    "dateModified": now_utc
                },
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Beranda",
                            "item": BASE_URL + "/"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": cat_name,
                            "item": category_url
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": headline,
                            "item": article_url
                        }
                    ]
                }
            ]
        }, ensure_ascii=False, separators=(",", ":"))
        + "</script>\n"
    )

# ======================================================
# LOAD DATA ARTIKEL
# ======================================================
with open("artikel.json", "r", encoding="utf-8") as f:
    data = json.load(f)

website_schema_injected = False
changed_files = 0

# ======================================================
# PROSES ARTIKEL
# ======================================================
for category, articles in data.items():
    for article in articles:
        headline, filename = article[0], article[1]
        html_path = os.path.join("artikel", filename)

        if not os.path.isfile(html_path):
            continue

        article_url = f"{BASE_URL}/artikel/{filename}"
        article_hash = hash_article(article_url, headline)
        new_hashes.add(article_hash)

        is_new_article = article_hash not in existing_hashes

        with open(html_path, "r", encoding="utf-8") as f:
            original_html = f.read()

        # hapus semua schema lama
        html = re.sub(SCHEMA_REGEX, "", original_html)

        inject_block = ""

        # inject WebSite schema sekali
        if not website_schema_injected:
            inject_block += build_website_schema()
            website_schema_injected = True

        # inject Article schema hanya jika artikel baru
        if is_new_article:
            inject_block += build_article_schema(category, article)

        if not inject_block or "</head>" not in html:
            continue

        new_html = html.replace("</head>", inject_block + "</head>")

        # skip jika tidak berubah
        if new_html == original_html:
            continue

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(new_html)

        changed_files += 1

# ======================================================
# UPDATE HASH CACHE
# ======================================================
with open(HASH_FILE, "w", encoding="utf-8") as f:
    for h in sorted(new_hashes):
        f.write(h + "\n")

print(f"✅ Schema injected into {changed_files} file(s)")

