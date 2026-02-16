import json
import os
import re
from datetime import datetime

# ======================================================
# KONFIGURASI GLOBAL (V7.0.0 - Self-Signature Edition)
# ======================================================
BASE_URL = "https://dalam.web.id"
SITE_NAME = "Layar Kosong"
AUTHOR = "Fakhrul Rijal"
LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/"

ALLOWED_CATEGORIES = {
    "gaya-hidup", "jejak-sejarah", "lainnya",
    "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"
}

SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

# Tanda unik untuk mengecek apakah file sudah diproses
SIGNATURE_KEY = "schema_oleh_Fakhrul_Rijal"

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
# SCHEMA BUILDER
# ======================================================
def build_combined_schema(category, article):
    headline, filename, image, iso_date, desc = article
    cat_slug = slugify(category)
    file_slug = filename.replace('.html', '').lstrip('/')
    
    clean_base = BASE_URL.rstrip('/')
    article_url = f"{clean_base}/{cat_slug}/{file_slug}".rstrip('/')
    category_url = f"{clean_base}/{cat_slug}".rstrip('/')
    
    cat_display_name = category_name_clean(category)
    keywords = build_keywords(headline, cat_display_name, file_slug)

    schema_data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": f"{clean_base}#website",
                "url": clean_base,
                "name": SITE_NAME,
                "publisher": {
                    "@type": "Organization",
                    "@id": f"{clean_base}#organization",
                    "name": SITE_NAME,
                    "url": clean_base,
                    "logo": {
                        "@type": "ImageObject",
                        "url": f"{clean_base}/logo.png",
                        "width": 384,
                        "height": 384
                    }
                }
            },
            {
                "@type": "Article",
                "@id": f"{article_url}#article",
                "isPartOf": {"@id": f"{clean_base}#website"},
                "mainEntityOfPage": {"@type": "WebPage", "@id": article_url},
                "license": LICENSE_URL,
                "headline": headline,
                "description": desc,
                "articleSection": cat_display_name,
                "keywords": keywords,
                "image": {"@type": "ImageObject", "url": image, "width": 1200, "height": 675},
                "author": {"@type": "Person", "name": AUTHOR, "url": f"{clean_base}/about"},
                "publisher": {"@id": f"{clean_base}#organization"},
                "datePublished": iso_date,
                "dateModified": iso_date
            },
            {
                "@type": "BreadcrumbList",
                "@id": f"{article_url}#breadcrumb",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Beranda", "item": clean_base},
                    {"@type": "ListItem", "position": 2, "name": cat_display_name, "item": category_url},
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

    results = {"changed": 0, "skipped": 0, "missing": 0, "forbidden": 0}
    tgl = datetime.now().strftime("%Y-%m-%d")
    signature = f"<noscript>{SIGNATURE_KEY}_{tgl}</noscript>"

    for category, articles in data.items():
        cat_slug = slugify(category)

        if cat_slug not in ALLOWED_CATEGORIES:
            results["forbidden"] += len(articles)
            continue

        for article in articles:
            filename = article[1]
            html_path = os.path.join(cat_slug, filename.lstrip('/'))

            if not os.path.isfile(html_path):
                results["missing"] += 1
                continue

            with open(html_path, "r", encoding="utf-8") as f:
                html_content = f.read()

            # === CEK SIGNATURE (Anti-Duplikat Lokal) ===
            if SIGNATURE_KEY in html_content:
                results["skipped"] += 1
                continue

            print(f"🧠 Injecting Schema & Signature: {html_path}")

            # 1. Bersihkan schema lama (jika ada)
            html_clean = re.sub(SCHEMA_REGEX, "", html_content)
            
            # 2. Build schema baru
            inject_code = build_combined_schema(category, article)

            # 3. Sisipkan schema ke bagian Head
            if "<style>" in html_clean:
                new_html = html_clean.replace("<style>", f"{inject_code}<style>")
            elif "</head>" in html_clean:
                new_html = html_clean.replace("</head>", f"{inject_code}</head>")
            else:
                new_html = inject_code + html_clean

            # 4. Tambahkan signature di paling bawah file (seperti script JS kamu)
            final_html = new_html.strip() + "\n" + signature

            with open(html_path, "w", encoding="utf-8") as f:
                f.write(final_html)

            results["changed"] += 1

    print("-" * 50)
    print(f"✅ SEO Schema Injector V7.0.0 (Noscript Signature Mode)")
    print(f"🆕 Di-inject & Terpatri : {results['changed']}")
    print(f"⏭️  Skip (Sudah Ada)    : {results['skipped']}")
    print(f"❌ File Tidak Ada      : {results['missing']}")
    print(f"🚫 Kategori Dilarang   : {results['forbidden']}")
    print("-" * 50)
