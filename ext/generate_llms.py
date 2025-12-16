import json
from datetime import datetime, date
import os

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"  # Pastiin nama file bener
OUTPUT_FILE = "llms.txt"
# --- END KONFIGURASI ---

def load_and_process_data(file_path):
    body_lines = []
    total_articles = 0
    try:
        if not os.path.exists(file_path):
            print(f"❌ File {file_path} nggak ketemu, bro! Cek folder ya.")
            return [], 0

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for category_key, articles in data.items():
            if not isinstance(articles, list) or not articles:
                continue  # Skip kategori kosong dari awal

            # Heading kategori
            category_title = f"📌 {category_key}"
            temp_lines = [f"## {category_title}", ""]  # Temp buat cek nanti ada isi apa nggak

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
                try:
                    # SKIP kalau nggak ada summary (len <5 atau item[4] kosong/empty string)
                    if len(item) < 5 or not item[4].strip():
                        print(f"⚠️ Skip artikel tanpa deskripsi: {item[0].strip() if len(item) > 0 else 'Unknown Title'}")
                        continue

                    title = item[0].strip()
                    slug = item[1].strip()
                    date_str = item[3][:10] if len(item) > 3 and item[3] else "N/A"
                    summary = item[4].strip()

                    full_url = f"{DOMAIN}/{slug}"

                    # Bullet super clean
                    temp_lines.append(f"- [**{title}**]({full_url}): {date_str}: {summary}")

                    article_count += 1
                except Exception as e:
                    print(f"⚠️ Error process item: {e}")
                    continue

            # Hanya tambah kategori ke body kalau ada artikel ber-summary
            if article_count > 0:
                total_articles += article_count
                body_lines.extend(temp_lines)
                body_lines.append("")  # Spasi antar kategori
            else:
                print(f"⚠️ Kategori '{category_key}' jadi kosong setelah skip no-summary, nggak dibikin H2.")

        return body_lines, total_articles

    except json.JSONDecodeError as e:
        print(f"❌ JSON rusak bro: {e}")
        return [], 0
    except Exception as e:
        print(f"❌ Error lain: {e}")
        return [], 0

def main():
    print("🔄 Generate full LLM index – semua artikel ber-summary masuk! 😏")

    body_lines, total_articles = load_and_process_data(ARTIKEL_JSON_PATH)

    if total_articles == 0:
        print("❌ Gak ada artikel yang punya summary, cek artikel.json lo ya!")
        return

    today = date.today().strftime("%d %B %Y")  # Auto 16 Desember 2025

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

    footer = [
        "",
        "Terima kasih telah mengunjungi. Kutip dengan link balik ke sumber asli. Dari Balikpapan dengan cinta. 🚀"
    ]

    full_content = header + body_lines + footer

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(full_content))

    print(f"✅ {OUTPUT_FILE} sukses digenerate! {total_articles} artikel ber-summary masuk full per kategori.")
    print("   Validator pasti diam sekarang – no skip, no empty, no plain text nakal. Deploy ke blog lo, crawler AI bakal happy banget! 🔥")

if __name__ == "__main__":
    main()
