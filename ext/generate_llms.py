import json
from datetime import datetime, date
import os

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"
OUTPUT_FILE = "llms.txt"
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

            temp_lines = []  # Collect dulu, baru tambah kalau ada isi

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
                body_lines.append("")  # Baris kosong setelah H2 (diikuti list, aman)
                body_lines.extend(temp_lines)
                body_lines.append("")  # Baris kosong antar kategori
                total_articles += article_count

        return body_lines, total_articles

    except Exception as e:
        print(f"❌ Error: {e}")
        return [], 0

def main():
    print("🔄 Generate index – versi paling minimalis, validator senyum lebar! 😏")

    body_lines, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if total_articles == 0:
        print("❌ Gak ada artikel ber-summary, cek JSON lo ya!")
        return

    today = date.today().strftime("%d %B %Y")

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

    # NO FOOTER SAMA SEKALI – akhir text tepat setelah kategori terakhir
    full_content = header + body_lines

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(full_content))

    print(f"✅ {OUTPUT_FILE} sukses! {total_articles} artikel ber-summary masuk.")
    print("   No footer, no plain text akhir, no empty H2 – validator pasti diem total sekarang. Deploy bro! 🔥")

if __name__ == "__main__":
    main()
