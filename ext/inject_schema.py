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

HASH_FILE = "mini/LD-JSON-Schema.txt"
os.makedirs("mini", exist_ok=True)

# DAFTAR FOLDER KATEGORI YANG DIIZINKAN (STRICT)
ALLOWED_CATEGORIES = {
    "gaya-hidup",
    "jejak-sejarah",
    "lainnya",
    "olah-media",
    "opini-sosial",
    "sistem-terbuka",
    "warta-tekno"
}

SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

STOPWORDS = {"yang", "untuk", "dengan", "adalah", "dalam", "dari", "pada", "atau", "itu", "dan", "sebuah", "aku", "ke", "saya", "ini", "gue", "gua", "elu", "elo"}

# ======================================================
# UTILITIES
# ======================================================
def slugify(text: str) -> str:
    return text.strip().lower().replace(" ", "-")

def category_name_clean(category: str) -> str:
    return category.strip().replace("-", " ").title()

def build_keywords(headline: str, category: str, slug: str) -> str:
    words = re.split(r"[^\w]+", headline.lower())
    refined_words = [w for w in words if len(w) > 3 and w not in STOPWORDS]
    base = set(refined_words)
    base.add(category.lower())
    slug_parts = slug.replace("-", " ").split()
    base.update([s for s in slug_parts if len(s) > 3])
    base.add("layar kosong")
    return ", ".join(sorted(base)[:12])

# ======================================================
# SINGLE SCHEMA BUILDER
# ======================================================
def build_combined_schema(category, article):
    headline, filename, image, iso_date, desc = article
    cat_slug = slugify(category)
    file_slug = filename.replace('.html', '').lstrip('/')
    article_url = f"{BASE_URL}/{cat_slug}/{file_slug}/"
    cat_display_name = category_name_clean(category)
    category_url = f"{BASE_URL}/{cat_slug}/"
    keywords = build_keywords(headline, cat_display_name, file_slug)

    schema_data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": f"{BASE_URL}/#website",
                "url": f"{BASE_URL}/",
                "name": SITE_NAME,
                "publisher": {
                    "@type": "Organization",
                    "@id": f"{BASE_URL}/#organization",
                    "name": SITE_NAME,
                    "url": BASE_URL,
                    "logo": {
                        "@type": "ImageObject",
                        "url": f"{BASE_URL}/logo.png",
                        "width": 384,
                        "height": 384
                    }
                }
            },
            {
                "@type": "Article",
                "@id": f"{article_url}#article",
                "isPartOf": {"@id": f"{BASE_URL}/#website"},
                "mainEntityOfPage": {"@type": "WebPage", "@id": article_url},
                "license": LICENSE_URL,
                "headline": headline,
                "description": desc,
                "articleSection": cat_display_name,
                "keywords": keywords,
                "image": {"@type": "ImageObject", "url": image, "width": 1200, "height": 675},
                "author": {"@type": "Person", "name": AUTHOR, "url": f"{BASE_URL}/about"},
                "publisher": {"@id": f"{BASE_URL}/#organization"},
                "datePublished": iso_date,
                "dateModified": iso_date
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{article_url}#breadcrumb",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Beranda", "item": f"{BASE_URL}/"},
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
        article_url
    )

# ======================================================
# EKSEKUSI UTAMA (STRICT CATEGORY & FOLDER FILTER)
# ======================================================
if __name__ == "__main__":
    if not os.path.exists("artikel.json"):
        print("❌ File artikel.json tidak ditemukan!")
        exit()

    with open("artikel.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    processed_urls = set()
    if os.path.isfile(HASH_FILE):
        with open(HASH_FILE, "r", encoding="utf-8") as f:
            for line in f:
                processed_urls.add(line.strip())

    results = {"changed": 0, "skipped": 0, "missing": 0, "forbidden": 0}

    for category, articles in data.items():
        cat_slug = slugify(category)

        # SECURITY CHECK: Hanya proses jika cat_slug ada di daftar ALLOWED
        if cat_slug not in ALLOWED_CATEGORIES:
            results["forbidden"] += len(articles)
            continue

        for article in articles:
            filename = article[1]
            file_slug = filename.replace('.html', '').lstrip('/')
            current_article_url = f"{BASE_URL}/{cat_slug}/{file_slug}/"

            if current_article_url in processed_urls:
                results["skipped"] += 1
                continue

            html_path = os.path.join(cat_slug, filename.lstrip('/'))

            if not os.path.isfile(html_path):
                results["missing"] += 1
                continue

            print(f"🧠 Injecting Schema: {current_article_url}")

            with open(html_path, "r", encoding="utf-8") as f:
                html_content = f.read()

            # Hapus skema lama dan sisipkan yang baru sebelum </head>
            html_clean = re.sub(SCHEMA_REGEX, "", html_content)

            if "</head>" in html_clean:
                inject_code, confirmed_url = build_combined_schema(category, article)
                new_html = html_clean.replace("</head>", inject_code + "</head>")

                with open(html_path, "w", encoding="utf-8") as f:
                    f.write(new_html)

                with open(HASH_FILE, "a", encoding="utf-8") as f:
                    f.write(confirmed_url + "\n")

                results["changed"] += 1

    print("-" * 50)
    print(f"✅ SEO Schema Injector V6.9 (Strict Mode)")
    print(f"🆕 Di-inject         : {results['changed']}")
    print(f"⏭️  Skip (Sudah Ada)   : {results['skipped']}")
    print(f"❌ File Tidak Ada     : {results['missing']}")
    print(f"🚫 Kategori Dilarang  : {results['forbidden']}")
    print("-" * 50)