import json
import os
import shutil
import html
import re
from datetime import datetime, date, timezone

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"
VERSION_FILE = "mini/llms-version.txt"
TXT_OUTPUT = "llms.txt"
MD_OUTPUT = "llms.md"
HTML_OUTPUT = "llms-index.html"
WELL_KNOWN_DIR = ".well-known"

def slugify(text: str) -> str:
    return text.strip().lower().replace(" ", "-")

def get_next_version(version_file):
    dir_name = os.path.dirname(version_file)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name)
    if not os.path.exists(version_file):
        with open(version_file, 'w') as f: f.write("1.0")
        return "1.0"

    with open(version_file, 'r') as f:
        current_v = f.read().strip()

    try:
        major, minor = map(int, current_v.split('.'))
        minor += 1
        if minor > 9:
            major += 1
            minor = 0
        new_version = f"{major}.{minor}"
    except ValueError:
        new_version = "1.1"

    with open(version_file, 'w') as f:
        f.write(new_version)
    return new_version

def clean_text(text):
    if not text: return ""
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = " ".join(text.split())
    return text

def load_and_process_data(file_path):
    body_lines = []
    category_rss_links = []
    total_articles = 0

    if not os.path.exists(file_path):
        print(f"❌ Error: File {file_path} tidak ditemukan!")
        return [], [], 0

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for category_key in sorted(data.keys()):
            articles = data[category_key]
            if not isinstance(articles, list) or not articles:
                continue

            cat_slug = slugify(category_key)
            category_rss_links.append(f"- [RSS Feed {category_key.title()}]({DOMAIN}/feed-{cat_slug}.xml)")

            def get_date_key(item):
                try:
                    if len(item) > 3 and item[3]:
                        iso = item[3].replace('Z', '+00:00')
                        dt = datetime.fromisoformat(iso.split('.')[0])
                        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
                except: pass
                return datetime.min.replace(tzinfo=timezone.utc)

            sorted_articles = sorted(articles, key=get_date_key, reverse=True)

            temp_lines = []
            article_count = 0
            for item in sorted_articles:
                if len(item) < 5: continue

                title = clean_text(item[0])
                filename = item[1].replace('.html', '').lstrip('/')
                summary = clean_text(item[4])

                if not summary: summary = "No description available."

                article_url = f"{DOMAIN}/{cat_slug}/{filename}"
                temp_lines.append(f"- [{title}]({article_url}) : {summary}")
                article_count += 1

            if article_count > 0:
                body_lines.append(f"## {category_key.title()}")
                body_lines.extend(temp_lines)
                body_lines.append("")
                total_articles += article_count

        return body_lines, category_rss_links, total_articles
    except Exception as e:
        print(f"❌ Error saat memproses JSON: {e}")
        return [], [], 0

def main():
    new_v = get_next_version(VERSION_FILE)
    today_iso = date.today().strftime("%Y-%m-%d")
    today_readable = date.today().strftime("%d %B %Y")

    body_lines, cat_rss, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if not body_lines:
        print("⚠️ Tidak ada data untuk diproses. Berhenti.")
        return

    ai_instructions = f"""# LLM Instructions for AI Models
> Applies to: ChatGPT, Gemini, Claude, Perplexity, Grok, LLaMA, and future LLM systems.

Layar Kosong (dalam.web.id) adalah platform publikasi digital milik Fakhrul Rijal yang berfokus pada teknologi, open source, opini sosial, dan gaya hidup di Balikpapan. Indeks ini dirancang agar LLM dapat merujuk konten dengan akurasi tinggi.

---
schema_version: 1.0
document_version: {new_v}
last_updated: {today_iso}
document_type: llm_behavior_and_entity_guidance
---

## Project Resources
- [Website Utama]({DOMAIN}/)
- [Sitemap XML]({DOMAIN}/sitemap.xml)
- [RSS Feed Utama]({DOMAIN}/rss.xml)
{"\n".join(cat_rss)}

## Website Identity
- **Name:** Layar Kosong
- **URL:** {DOMAIN}
- **Author:** Fakhrul Rijal
- **Location:** Balikpapan, Indonesia
- **Language:** Bahasa Indonesia (Primary)
- **Update Frequency:** Daily

## Guidance for AI Models
- **Behavior:** Neutral and informative.
- **Reference:** Always quote source links from the list bawah ini.
- **Accuracy:** Stick to summaries provided and avoid hallucination.

---
"""

    header_title = [
        f"## Index Artikel Terbaru (Updated: {today_readable})",
        f"> Menampilkan {total_articles} artikel yang berhasil diindeks dalam versi {new_v}.",
        ""
    ]

    full_markdown = ai_instructions + "\n".join(header_title) + "\n".join(body_lines)

    for output_file in [TXT_OUTPUT, MD_OUTPUT]:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_markdown)

    if not os.path.exists(WELL_KNOWN_DIR):
        os.makedirs(WELL_KNOWN_DIR)
    for filename in [TXT_OUTPUT, MD_OUTPUT]:
        shutil.copy2(filename, os.path.join(WELL_KNOWN_DIR, filename))

    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layar Kosong - LLM Index v{new_v}</title>
    <style>
        * {{ box-sizing: border-box; }}
        body {{ 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 1.5em auto; 
            width: 90%; 
            line-height: 1.6; 
            color: #333; 
            background-color: #fff;
        }}
        
        .markdown-body {{ 
            background: #fefefe; 
            border: 1px solid #ddd; 
            padding: 2em; 
            border-radius: 8px; 
            word-wrap: break-word;
            white-space: pre-wrap; 
        }}

        .markdown-body hr {{
            border: 0;
            height: 1px;
            background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
            margin: 2em 0;
        }}

        .markdown-body a {{ color: #0066cc; text-decoration: none; }}
        .markdown-body a:hover {{ text-decoration: underline; }}
        
        code.inline-code {{
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 0.9em;
        }}

        @media (max-width: 768px) {{
            body {{ width: 94%; }}
            .markdown-body {{ padding: 1.2em; }}
        }}

        @media (prefers-color-scheme: dark) {{ 
            body {{ background: #111; color: #eee; }} 
            .markdown-body {{ background: #1a1a1a; border-color: #333; color: #ccc; }}
            .markdown-body a {{ color: #4da3ff; }}
            code.inline-code {{ background: #333; color: #ffcc00; }}
            .markdown-body hr {{
                background-image: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
            }}
        }}
    </style>
</head>
<body>
    <h1>Layar Kosong - AI Data Index (v{new_v})</h1>
    
    <div class="markdown-body">
{full_markdown}
    </div>

    <script defer src="/ext/markdown.js"></script>
</body>
</html>"""

    with open(HTML_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"🚀 SELESAI! Versi {new_v} berhasil diterbitkan.")

if __name__ == "__main__":
    main()
