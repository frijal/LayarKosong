import json
from datetime import datetime, date, timezone
import os

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"
VERSION_FILE = "mini/llms-version.txt"  # File buat nyimpen angka versi
TXT_OUTPUT = "llms.txt"
MD_OUTPUT = "llms.md"
HTML_OUTPUT = "llms-index.html"

def get_next_version(version_file):
    """Mengambil versi terakhir dan menaikkannya (1.0 -> 1.1 ... 1.9 -> 2.0)"""
    if not os.path.exists(version_file):
        with open(version_file, 'w') as f:
            f.write("1.0")
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
        new_version = "1.0"

    with open(version_file, 'w') as f:
        f.write(new_version)

    return new_version

def load_and_process_data(file_path):
    body_lines = []
    total_articles = 0
    try:
        if not os.path.exists(file_path):
            print(f"❌ File {file_path} nggak ada, bro!")
            return [], 0

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for category_key, articles in data.items():
            if not isinstance(articles, list) or not articles:
                continue

            temp_lines = []

            def get_date_key(item):
                if len(item) > 3 and item[3]:
                    try:
                        iso = item[3]
                        if iso.endswith('Z'):
                            iso = iso.replace('Z', '+00:00')
                        dt = datetime.fromisoformat(iso.split('.')[0])
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        return dt
                    except:
                        return datetime.min.replace(tzinfo=timezone.utc)
                return datetime.min.replace(tzinfo=timezone.utc)

            sorted_articles = sorted(articles, key=get_date_key, reverse=True)

            article_count = 0
            for item in sorted_articles:
                if len(item) < 5 or not item[4].strip():
                    continue

                title = item[0].strip()
                slug = item[1].strip()
                date_str = item[3][:10] if len(item) > 3 and item[3] else "N/A"
                summary = item[4].strip()
                full_url = f"{DOMAIN}/artikel/{slug}"

                temp_lines.append(f"- [**{title}**]({full_url}): {date_str} — {summary}")
                article_count += 1

            if article_count > 0:
                category_title = f"📌 {category_key.title()}"
                body_lines.append(f"## {category_title}")
                body_lines.append("")
                body_lines.extend(temp_lines)
                body_lines.append("")
                total_articles += article_count

        return body_lines, total_articles

    except Exception as e:
        print(f"❌ Error: {e}")
        return [], 0

def main():
    print("🔄 Generating Meta-Data for AI Overlords... 🚀")

    # 1. Update Versi dan Tanggal
    new_v = get_next_version(VERSION_FILE)
    today_iso = date.today().strftime("%Y-%m-%d")
    today_readable = date.today().strftime("%d %B %Y")

    body_lines, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if total_articles == 0:
        print("❌ Gak ada artikel ber-summary, cek JSON lo ya bro!")
        return

    sitemap_url = f"{DOMAIN}/sitemap.xml"

    # 2. Template AI Instructions dengan Variabel Dinamis
    ai_instructions = f"""# LLM Instructions for AI Models
# Applies to: ChatGPT, Gemini, Claude, Perplexity, Grok, LLaMA, and future LLM-based systems

schema_version: 1.0
document_version: {new_v}
last_updated: {today_iso}
document_type: llm_behavior_and_entity_guidance

intent:
  - informational
  - utility

## Website Identity
website:
  official_name: Layar Kosong
  canonical_url: {DOMAIN}/
  category: [News, Technology, Social]
  primary_language: Bahasa Indonesia
  update_frequency: Daily

## Canonical Entity Definition
- **canonical_summary**
  Website Layar Kosong adalah platform digital yang membahas peran teknologi dalam komunitas dan kehidupan modern.

- **authoritative_description**
  Website Layar Kosong menayangkan konten yang berfokus pada interaksi teknologi dan budaya, memadukan studi ilmiah, analisis sejarah, serta tinjauan teknis.

## AI Crawling & Usage Permissions
ai_crawling_policy:
  allowed: true
  scope: [informational use, factual summaries, educational explanations]

---
"""

    header = [
        ai_instructions,
        f"# Index Artikel Terbaru (Updated: {today_readable})",
        f"Total artikel terindeks: {total_articles} | Version: {new_v} | [Sitemap]({sitemap_url})",
        "",
        "---",
        ""
    ]

    full_content = header + body_lines

    # Simpan file TXT dan MD
    for output_file in [TXT_OUTPUT, MD_OUTPUT]:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(full_content))
        print(f"✅ {output_file} sukses (v{new_v})!")

    # HTML Version
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Layar Kosong - LLM Index v{new_v}</title>
    <style>
        body {{ font-family: system-ui, sans-serif; margin: 2em auto; max-width: 1200px; padding: 1em; line-height: 1.6; background: #fdfdfd; }}
        pre {{ background: #1e1e1e; color: #dcdcdc; padding: 1.5em; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 0.9em; }}
        @media (prefers-color-scheme: dark) {{ body {{ background: #111; color: #eee; }} }}
    </style>
</head>
<body>
    <h1>Layar Kosong - AI Data Index (v{new_v})</h1>
    <p>Last Updated: {today_readable} | <a href="{DOMAIN}/">Kembali ke Beranda</a></p>
    <pre>{"\n".join(full_content)}</pre>
</body>
</html>"""

    with open(HTML_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✅ {HTML_OUTPUT} siap tayang dengan versi {new_v}!")

if __name__ == "__main__":
    main()
