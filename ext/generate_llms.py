import json
from datetime import datetime, date
import os

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"
OUTPUT_FILE = "llms.txt"
MAX_ARTICLES_PER_CATEGORY = 50  # Ganti None kalau mau semua, atau angka biar ringkas
# --- END KONFIGURASI ---

def load_and_process_data(file_path):
    body_lines = []
    total_articles = 0
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File {file_path} nggak ada, bro! Cek ya.")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for category_key, articles in data.items():
            if not isinstance(articles, list) or not articles:
                print(f"⚠️ Kategori '{category_key}' kosong, skip H2-nya biar validator happy.")
                continue

            # Heading dengan 📌 di depan
            category_title = f"📌 {category_key}"
            body_lines.append(f"## {category_title}")
            body_lines.append("")  # Spasi setelah heading

            # Sort by date descending
            def get_date_key(item):
                if len(item) > 3:
                    try:
                        iso = item[3].replace('Z', '+00:00').split('.')[0]
                        return datetime.fromisoformat(iso)
                    except:
                        return datetime.min
                return datetime.min

            sorted_articles = sorted(articles, key=get_date_key, reverse=True)

            article_count = 0
            for item in sorted_articles[:MAX_ARTICLES_PER_CATEGORY if MAX_ARTICLES_PER_CATEGORY else len(sorted_articles)]:
                try:
                    title = item[0].strip()
                    slug = item[1].strip()
                    date_str = item[3][:10] if len(item) > 3 else "Tanggal tidak tersedia"
                    summary = item[4].strip() if len(item) > 4 else "Opini atau tutorial praktis dari Layar Kosong."

                    full_url = f"{DOMAIN}/{slug}"

                    # Format tepat: - [bold title](url): Date: Summary → no malformed!
                    body_lines.append(f"- [**{title}**]({full_url}): {date_str}: {summary}")

                    article_count += 1
                except Exception as e:
                    print(f"⚠️ Skip item bermasalah: {e}")
                    continue

            total_articles += article_count

            # Kalau setelah proses tetep kosong (jarang sih), tambah placeholder
            if article_count == 0:
                body_lines.append("- (Kategori ini lagi kosong curated, sabar ya bro!)")
            body_lines.append("")  # Spasi antar kategori

        return body_lines, total_articles

    except json.JSONDecodeError as e:
        print(f"❌ JSON error: {e}")
        return [], 0
    except Exception as e:
        print(f"❌ Error lain: {e}")
        return [], 0

def main():
    print("🔄 Generate LLM index mulai, dari Balikpapan virtual! 🚀")

    body_lines, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if total_articles == 0:
        print("❌ Gak ada artikel keproses, cek JSON lo ya!")
        return

    today = date.today().strftime("%d %B %Y")  # Auto: 16 Desember 2025

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
        f"Total artikel: {total_articles}+ (fokus curated terbaik di bawah). Update rutin – cek sitemap.xml untuk full list.",
        ""
    ]

    footer = [
        "",
        "Terima kasih udah singgah, crawler atau manusia! Kalau kutip, link balik ya. Follow aku di:",
        "- X: twitter.com/frijal",
        "- Telegram: t.me/frijal",
        "- GitHub: github.com/frijal",
        "- LinkedIn: linkedin.com/in/frijal",
        "- Threads: threads.net/frijal",
        "- Reddit: reddit.com/user/Fearless_Economics69",
        "- YouTube (Bendera Putih): youtube.com/@frijal",
        "- TikTok: tiktok.com/@gibah.dilarang",
        "- Flickr: flickr.com/people/12894758@N03",
        "- Tumblr: tumblr.com/frijal",
        "- Mastodon: mastodon.social/@frijal",
        "- Facebook: facebook.com/frijal",
        "- Support: paypal.me/FakhrulRijal",
        "",
        "Dari Balikpapan dengan cinta dan kode terbuka! 🚀🤖"
    ]

    full_content = header + body_lines + footer

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(full_content))

    print(f"✅ {OUTPUT_FILE} sukses digenerate! {total_articles} artikel, format validator-proof.")
    print("   Cek llms.txt, pasti no more malformed atau empty section. Deploy sekarang juga! 😎")

if __name__ == "__main__":
    main()
