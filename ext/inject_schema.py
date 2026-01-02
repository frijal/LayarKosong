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
# REGEX HAPUS SEMUA SCHEMA EXISTING
# ======================================================
SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

# ======================================================
# UTILITIES
# ======================================================
def strip_html(filename: str) -> str:
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
        }, separators=(",", ":"))
        + "</script>\n"
    )

def build_article_schema(category, article):
    headline, filename, image, iso_date, desc = article

    slug = strip_html(filename)
    article_url = f"{BASE_URL}/artikel/{slug}"

    cat_slug = category_slug(category)
    cat_name = category_name(category)
    category_url = f"{BASE_URL}/artikel/-/{cat_slug}/"

    keywords = build_keywords(headline, cat_name, slug)

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
                        "name": AUTHOR
                    },
                    "publisher": {
                        "@type": "Organization",
                        "@id": ORG_ID
                    },
                    "datePublished": iso_date,
                    "dateModified": iso_date
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

# ======================================================
# LOAD URL YANG SUDAH DIPROSES
# ======================================================
processed_urls = set()
if os.path.isfile(HASH_FILE):
    with open(HASH_FILE, "r", encoding="utf-8") as f:
        for line in f:
            processed_urls.add(line.strip())

new_urls = set()
website_schema_injected = False
changed_files = 0
skipped_files = 0

# ======================================================
# PROSES ARTIKEL (INCREMENTAL)
# ======================================================
for category, articles in data.items():
    for article in articles:
        filename = article[1]
        html_path = os.path.join("artikel", filename)

        if not os.path.isfile(html_path):
            continue

        slug = strip_html(filename)
        article_url = f"{BASE_URL}/artikel/{slug}"

        # 👉 INI KUNCINYA
        if article_url in processed_urls:
            skipped_files += 1
            continue

        with open(html_path, "r", encoding="utf-8") as f:
            original_html = f.read()

        html = re.sub(SCHEMA_REGEX, "", original_html)

        inject = ""
        if not website_schema_injected:
            inject += build_website_schema()
            website_schema_injected = True

        inject += build_article_schema(category, article)

        if "</head>" not in html:
            continue

        new_html = html.replace("</head>", inject + "</head>")

        if new_html == original_html:
            continue

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(new_html)

        new_urls.add(article_url)
        changed_files += 1

# ======================================================
# UPDATE FILE URL (MERGE LAMA + BARU)
# ======================================================
all_urls = sorted(processed_urls | new_urls)
with open(HASH_FILE, "w", encoding="utf-8") as f:
    for url in all_urls:
        f.write(url + "\n")

print(f"✅ Incremental LD+JSON selesai")
print(f"🆕 Artikel baru diproses : {changed_files}")
print(f"⏭️ Artikel dilewati       : {skipped_files}")
