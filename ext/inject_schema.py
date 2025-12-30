import json
import os
import re
import hashlib
from datetime import datetime

BASE_URL = "https://dalam.web.id"
SITE_NAME = "Layar Kosong"
AUTHOR = "Fakhrul Rijal"
LOGO_URL = f"{BASE_URL}/logo.png"
WEBSITE_ID = f"{BASE_URL}/#website"

HASH_FILE = "mini/article-hash.txt"

SCHEMA_REGEX = re.compile(
    r'<script type="application/ld\+json">.*?</script>',
    re.DOTALL
)

os.makedirs("mini", exist_ok=True)

# === Load existing hashes ===
existing_hashes = set()
if os.path.isfile(HASH_FILE):
    with open(HASH_FILE, "r") as f:
        existing_hashes = set(line.strip() for line in f if line.strip())

new_hashes = set()

def hash_title(title: str) -> str:
    return hashlib.sha1(title.strip().encode("utf-8")).hexdigest()

def build_website_schema():
    schema = {
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
                "width": 48,
                "height": 48
            }
        }
    }
    return f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>\n'

def build_article_schema(category, article):
    headline, filename, image, date_pub, desc = article
    url = f"{BASE_URL}/artikel/{filename}"
    category_url = f"{BASE_URL}/artikel/-/{category}/"

    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": f"{url}#article",
                "isPartOf": {
                    "@id": WEBSITE_ID
                },
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": url
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
                        "width": 48,
                        "height": 48
                    }
                },
                "datePublished": date_pub,
                "dateModified": datetime.utcnow().strftime("%Y-%m-%d")
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
                        "name": category.replace("-", " ").title(),
                        "item": category_url
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": headline,
                        "item": url
                    }
                ]
            }
        ]
    }

    return f'<script type="application/ld+json">\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n</script>\n'

with open("artikel.json", "r", encoding="utf-8") as f:
    data = json.load(f)

website_schema_injected = False
changed_files = 0

for category, articles in data.items():
    for article in articles:
        headline = article[0]
        filename = article[1]
        html_path = os.path.join("artikel", filename)

        if not os.path.isfile(html_path):
            continue

        title_hash = hash_title(headline)
        new_hashes.add(title_hash)

        # Skip jika artikel lama dan hash sudah pernah diproses
        is_new_article = title_hash not in existing_hashes

        with open(html_path, "r", encoding="utf-8") as f:
            original_html = f.read()

        html = re.sub(SCHEMA_REGEX, "", original_html)

        inject_block = ""

        # Inject WebSite schema sekali saja
        if not website_schema_injected:
            inject_block += build_website_schema()
            website_schema_injected = True

        # Inject Article schema hanya jika artikel baru
        if is_new_article:
            inject_block += build_article_schema(category, article)

        if not inject_block:
            continue

        if "</head>" not in html:
            continue

        new_html = html.replace("</head>", inject_block + "\n</head>")

        # Skip jika HTML tidak berubah
        if new_html == original_html:
            continue

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(new_html)

        changed_files += 1

# === Update hash cache ===
with open(HASH_FILE, "w") as f:
    for h in sorted(new_hashes):
        f.write(h + "\n")

print(f"✅ Schema injected into {changed_files} file(s)")
