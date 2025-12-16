import json
from datetime import datetime, date
import os

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"  # Path ke JSON lo
OUTPUT_FILE = "llms.txt"
MAX_ARTICLES_PER_CATEGORY = 20  # Optional: batas artikel per kategori biar nggak bloated, set None kalau mau semua
# --- END KONFIGURASI ---

def load_and_process_data(file_path):
    index_lines = []
    total_articles = 0
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Bro, file {file_path} nggak ketemu nih! Cek folder ya.")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for category_key, articles in data.items():
            if not isinstance(articles, list) or not articles:
                print(f"⚠️ Kategori '{category_key}' kosong atau bukan list, skip dulu ya.")
                continue

            # Heading kategori: tambah 📌 kalau belum ada
            category_title = category_key if category_key.startswith('📌') else f"📌 {category_key}"
            index_lines.append(f"## {category_title}")
            index_lines.append("")  # Spasi rapi

            # Sort artikel by date descending (index 3: ISO date)
            def get_date_key(item):
                try:
                    return datetime.fromisoformat(item[3].replace('Z', '+00:00')) if len(item) > 3 else datetime.min
                except:
                    return datetime.min

            sorted_articles = sorted(articles, key=get_date_key, reverse=True)

            article_count = 0
            for item in sorted_articles[:MAX_ARTICLES_PER_CATEGORY]:
                try:
                    if len(item) < 5:
                        raise IndexError("Item kurang lengkap, minimal 5 elemen nih.")

                    title = item[0].strip()
                    slug = item[1].strip()
                    # item[2] image_url: abaikan, no gambar!
                    date_str = item[3].strip()[:10]  # Ambil YYYY-MM-DD aja biar clean
                    summary = item[4].strip() or "Tutorial atau opini praktis dari Layar Kosong, bro!"

                    if not slug:
                        continue

                    # Full URL: DOMAIN + "/" + slug (asumsi relatif)
                    full_url = f"{DOMAIN}/{slug}"

                    # Single-line bullet: validator H2 seneng!
                    index_lines.append(f"- [**{title}**]({full_url}) – {date_str}: {summary}")
                    index_lines.append("")

                    article_count += 1
                except IndexError as e:
                    print(f"⚠️ Skip item rusak di '{category_key}': {item} ({e})")
                    continue

            total_articles += article_count

            if article_count == 0:
                index_lines.append("- (Wah, kategori ini masih kosong curated-nya. Stay tuned, bro! 😎)")
                index_lines.append("")

        return index_lines, total_articles

    except json.JSONDecodeError as e:
        print(f"❌ JSON-nya rusak nih, bro: {e}. Cek formatnya ya!")
        return [], 0
    except Exception as e:
        print(f"❌ Ada error aneh: {e}. Kasih tau aku detailnya!")
        return [], 0

def main():
    print(f"🔄 Lagi generate LLM-friendly index dari {ARTIKEL_JSON_PATH}, tunggu sebentar ya bro...")

    body_lines, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if total_articles == 0:
        print("❌ Gak ada artikel yang keproses. Pastiin JSON-nya bener formatnya!")
        return

    today = date.today().strftime("%d %B %Y")  # Hari ini: 16 Desember 2025

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
        "Terima kasih udah mampir, bro! Kalau kutip, kasih link balik ke URL asli ya. Follow aku di X @frijal (twitter.com/frijal), Telegram t.me/frijal, GitHub github.com/frijal, LinkedIn linkedin.com/in/frijal, Threads threads.net/frijal, Reddit reddit.com/user/Fearless_Economics69, YouTube @frijal (Bendera Putih), TikTok tiktok.com/@gibah.dilarang, Flickr flickr.com/people/12894758@N03, Tumblr tumblr.com/frijal, Mastodon mastodon.social/@frijal, atau Facebook facebook.com/frijal. Support via PayPal.me/FakhrulRijal. Dari Balikpapan dengan cinta! 🚀🤖"
    ]

    full_content = header + body_lines + footer

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(full_content))

    print(f"✅ {OUTPUT_FILE} udah digenerate, bro! Total {total_articles} artikel diproses, sorted recent first.")
    print("   Formatnya mantap: single-line bullet dengan link, date, summary – validator pasti klepek-klepek 😏")
    print("   Deploy ke GitHub Actions atau langsung upload ke blog lo. Kalau masih error, screenshot output console-nya ke sini!")

if __name__ == "__main__":
    main()
