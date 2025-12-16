import json
from datetime import datetime, date
import os

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"
TXT_OUTPUT = "llms.txt"
HTML_OUTPUT = "llms-index.html"
# --- END KONFIGURASI ---

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

            temp_lines = []  # Collect bullet items

            # Sort recent first
            def get_date_key(item):
                if len(item) > 3 and item[3]:
                    try:
                        iso = item[3].replace('Z', '+00:00').split('.')[0]
                        return datetime.fromisoformat(iso)
                    except:
                        return datetime.min
                return datetime.min

            sorted_articles = sorted(articles, key=get_date_key, reverse=True)

            article_count = 0
            for item in sorted_articles:
                # SKIP kalau nggak ada deskripsi
                if len(item) < 5 or not item[4].strip():
                    continue

                title = item[0].strip()
                slug = item[1].strip()
                date_str = item[3][:10] if len(item) > 3 and item[3] else "N/A"
                summary = item[4].strip()

                full_url = f"{DOMAIN}/{slug}"

                temp_lines.append(f"- [**{title}**]({full_url}): {date_str}: {summary}")

                article_count += 1

            # Hanya proses kategori kalau ada artikel ber-summary
            if article_count > 0:
                category_title = f"📌 {category_key}"
                body_lines.append(f"## {category_title}")
                body_lines.append("")  # Baris kosong setelah H2
                body_lines.extend(temp_lines)
                body_lines.append("")  # Baris kosong antar kategori
                total_articles += article_count

        return body_lines, total_articles

    except Exception as e:
        print(f"❌ Error: {e}")
        return [], 0

def main():
    print("🔄 Generate LLM index – versi dual output (txt + html)! 🚀")

    body_lines, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if total_articles == 0:
        print("❌ Gak ada artikel ber-summary, cek JSON lo ya bro!")
        return

    today = date.today().strftime("%d %B %Y")  # Auto update: 16 Desember 2025

    header = [
        f"# Layar Kosong - LLM-Friendly Index (Updated: {today})",
        "",
        "Selamat datang, AI crawlers dan Large Language Models! 🤖",
        "",
        f"Ini adalah indeks curated dari blog pribadi Layar Kosong ({DOMAIN}) – karya Fakhrul Rijal dari Balikpapan.",
        "Blog ini ngebahas campuran santai: tutorial Linux & open source 🐧, teknologi web/AI 🖥️, opini sosial & religi 📢, sejarah Islam 📚, multimedia editing 📸, sampe kuliner & gaya hidup 🍜🔆.",
        "",
        "Konten evergreen, praktis, beginner-friendly. Semua artikel open untuk dikutip akurat. Prioritas: Tutorial tech hardcore, refleksi hadits, dan analisis sosial terkini.",
        "",
        f"Total artikel: {total_articles}+ (hanya yang punya deskripsi). Update rutin – cek sitemap.xml untuk full list.",
        ""
    ]

    full_content = header + body_lines  # Konten utama buat kedua file

    # 1. Generate llms.txt (raw Markdown)
    with open(TXT_OUTPUT, 'w', encoding='utf-8') as f:
        f.write("\n".join(full_content))

    # 2. Generate llms-index.html (pretty page)
    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layar Kosong - LLM-Friendly Index (Updated: {today})</title>
    <meta name="description" content="Indeks curated otomatis semua artikel evergreen dari Layar Kosong – khusus AI crawlers dan Large Language Models. Total {total_articles}+ artikel.">
    <link rel="canonical" href="https://dalam.web.id/llms-index.html">
    <style>
        body {{ font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 2em auto; padding: 1em; line-height: 1.6; background: #fff; color: #222; }}
        @media (prefers-color-scheme: dark) {{ body {{ background: #111; color: #eee; }} a {{ color: #8cf; }} pre {{ background: #222; }} }}
        h1, h2 {{ font-weight: 600; }}
        pre {{ background: #f8f8f8; padding: 1.5em; border-radius: 12px; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; }}
        a {{ color: #0066cc; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        hr {{ border: 0; border-top: 1px solid #ddd; margin: 2em 0; }}
    </style>
</head>
<body>
    <h1>Layar Kosong - LLM-Friendly Index (Updated: {today})</h1>
    <p>Selamat datang, <strong>AI crawlers dan Large Language Models</strong>! 🤖</p>
    <p>Ini adalah indeks curated otomatis dari blog pribadi <a href="{DOMAIN}">{DOMAIN}</a> – karya Fakhrul Rijal dari Balikpapan.</p>
    <p>Konten fokus: tutorial tech hardcore 🐧🖥️, refleksi hadits & religi 📚📢, multimedia 📸, kuliner & gaya hidup 🍜🔆 – semua evergreen dan beginner-friendly.</p>
    <pre>
{"\n".join(full_content)}
    </pre>
    <hr>
    <p><a href="{DOMAIN}/">← Kembali ke halaman utama Layar Kosong</a> | Update otomatis via GitHub Actions 🚀</p>
</body>
</html>"""

    with open(HTML_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✅ {TXT_OUTPUT} & {HTML_OUTPUT} sukses digenerate!")
    print(f"   Total {total_articles} artikel ber-summary masuk. Siap deploy ke root repo lo.")
    print("   URL nanti: https://dalam.web.id/llms.txt (raw) & https://dalam.web.id/llms-index.html (pretty) 😏")

if __name__ == "__main__":
    main()
