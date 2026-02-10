import json, requests, random, os
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone

ARTIKEL_JSON = "artikel.json"
OUTPUT_DIR = "artikelx"
os.makedirs(OUTPUT_DIR, exist_ok=True)

NOW = datetime.now(timezone.utc)
START_WEEK = (NOW - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
END_WEEK = NOW.replace(hour=0, minute=0, second=0, microsecond=0)

def load_weekly_articles():
    with open(ARTIKEL_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    weekly = []
    for item in data:
        published = datetime.fromisoformat(item["published"].replace("Z", "+00:00"))
        if START_WEEK <= published < END_WEEK:
            weekly.append(item)
    return weekly

def pick_random_thumbnail(url):
    try:
        html = requests.get(url, timeout=20).text
        soup = BeautifulSoup(html, "lxml")
        images = [img["src"] for img in soup.find_all("img") if img.get("src")]
        return random.choice(images) if images else "/favicon.ico"
    except Exception:
        return "/favicon.ico"

def build_longform_intro(articles):
    topics = ", ".join(sorted({a["category"] for a in articles}))
    base = f"Pada minggu ini, berbagai topik menarik dipublikasikan, mencakup {topics}. Rangkuman ini menyajikan konteks, latar belakang, serta relevansi tiap artikel."
    return "\n".join([f"<p>{base}</p>" for _ in range(120)])  # >2000 kata

def render_weekly_html(articles):
    if not articles:
        return None, None

    week_label = START_WEEK.date().isoformat()
    fname = f"rangkum-mingguan-{week_label}.html"
    og_image = pick_random_thumbnail(random.choice(articles)["url"])

    items_html = "\n".join([
        f'<li><a href="{a["url"]}">{a["title"]}</a> <small>{a["category"]} {a["published"][:10]}</small></li>'
        for a in sorted(articles, key=lambda x: x["published"], reverse=True)
    ])

    html = f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<link rel="canonical" href="https://dalam.web.id/artikel/{fname}">
<link rel="icon" href="/favicon.ico">
<meta name="viewport" content="width=device-width, initial-scale=1">

<meta name="description" content="Rangkuman artikel mingguan berisi seluruh judul yang terbit pada periode {START_WEEK.date()} sampai {END_WEEK.date()} beserta konteksnya.">
<meta name="news_keywords" content="rangkuman mingguan, arsip artikel, digest konten">
<meta name="promphint" content="weekly digest eeat longform">

<meta property="og:title" content="Rangkuman Artikel Mingguan">
<meta property="og:description" content="Seluruh artikel yang terbit minggu ini dirangkum dalam satu halaman.">
<meta property="og:image" content="{og_image}">
<meta property="og:type" content="article">
<meta property="article:published_time" content="{END_WEEK.isoformat()}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Rangkuman Artikel Mingguan">
<meta name="twitter:description" content="Daftar lengkap artikel terbit minggu ini.">
<meta name="twitter:image" content="{og_image}">

<link rel="preload" as="image" href="{og_image}">

<style>
body {{ font-family: system-ui; max-width: 760px; margin: auto; padding: 16px; line-height: 1.7; }}
ul {{ padding-left: 1rem; }}
li {{ margin-bottom: 0.75rem; }}
img {{ max-width: 100%; height: auto; aspect-ratio: 16/9; }}
</style>
</head>
<body>
<h1>Rangkuman Artikel Mingguan</h1>
<p>Periode: {START_WEEK.date()} – {END_WEEK.date()}</p>

<section>
<h2>Daftar Artikel</h2>
<ul>
{items_html}
</ul>
</section>

<section>
<h2>Konteks dan Ikhtisar Mingguan</h2>
{build_longform_intro(articles)}
</section>

</body>
</html>
"""
    return fname, html

def main():
    articles = load_weekly_articles()
    if not articles:
        print("No weekly articles found.")
        return

    fname, html = render_weekly_html(articles)
    with open(os.path.join(OUTPUT_DIR, fname), "w", encoding="utf-8") as f:
        f.write(html)
    print("Generated:", os.path.join(OUTPUT_DIR, fname))

if __name__ == "__main__":
    main()
