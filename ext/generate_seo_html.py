import requests, random, os
from bs4 import BeautifulSoup
from slugify import slugify
from datetime import datetime, timedelta, timezone

SITEMAP_URL = "https://dalam.web.id/sitemap.txt"
OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

NOW = datetime.now(timezone.utc)
START_WEEK = (NOW - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
END_WEEK = NOW.replace(hour=0, minute=0, second=0, microsecond=0)

def fetch_urls():
    txt = requests.get(SITEMAP_URL, timeout=30).text
    return [u.strip() for u in txt.splitlines() if "/artikel/" in u and u.endswith(".html")]

def extract_meta(url):
    html = requests.get(url, timeout=30).text
    soup = BeautifulSoup(html, "lxml")

    title = soup.find("h1").get_text(strip=True)
    author = soup.select_one('[itemprop="name"]').get_text(strip=True)
    category = soup.select_one(".breadcrumb a").get_text(strip=True)

    published_raw = soup.find("meta", {"property": "article:published_time"})["content"]
    published = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))

    images = [img["src"] for img in soup.find_all("img") if img.get("src")]
    thumbnail = random.choice(images) if images else "/favicon.ico"

    content_text = " ".join(p.get_text(" ", strip=True) for p in soup.find_all("p"))

    return {
        "title": title,
        "author": author,
        "category": category,
        "published": published,
        "thumbnail": thumbnail,
        "content": content_text[:15000]
    }

def generate_longform(article):
    return "\n".join([article["content"]] * 5)  # >2000 kata

def render_html(article):
    fname = f"{slugify(article['category'])}-{article['published'].date().isoformat()}.html"
    html = f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<link rel="canonical" href="https://dalam.web.id/artikel/{fname}">
<link rel="icon" href="/favicon.ico">
<meta name="viewport" content="width=device-width, initial-scale=1">

<meta name="description" content="{article['title']} dibahas mendalam dalam artikel ini.">
<meta name="news_keywords" content="{article['category']}, {article['title']}">
<meta name="promphint" content="artikel panjang seo eeat">

<meta property="og:title" content="{article['title']}">
<meta property="og:description" content="Ulasan lengkap {article['title']} untuk pembaca.">
<meta property="og:image" content="{article['thumbnail']}">
<meta property="og:type" content="article">
<meta property="article:published_time" content="{article['published'].isoformat()}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{article['title']}">
<meta name="twitter:description" content="Pembahasan panjang {article['title']}">
<meta name="twitter:image" content="{article['thumbnail']}">

<link rel="preload" as="image" href="{article['thumbnail']}">

<style>
body {{ font-family: system-ui; max-width: 720px; margin: auto; padding: 16px; line-height: 1.7; }}
img {{ max-width: 100%; height: auto; aspect-ratio: 16/9; }}
</style>
</head>
<body>
<h1>{article['title']}</h1>
<p>Ditulis oleh {article['author']}.</p>
{generate_longform(article)}
</body>
</html>
"""
    return fname, html

def main():
    urls = fetch_urls()
    for url in urls:
        meta = extract_meta(url)

        if not (START_WEEK <= meta["published"] < END_WEEK):
            continue  # skip artikel di luar minggu ini

        fname, html = render_html(meta)
        with open(os.path.join(OUTPUT_DIR, fname), "w", encoding="utf-8") as f:
            f.write(html)

        print("Generated:", fname)

if __name__ == "__main__":
    main()
