import json
from datetime import date  # Buat tanggal update otomatis

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
# --- END KONFIGURASI ---

def get_index_data_from_artikel_json(file_path):
    """
    Membaca artikel.json dan mengembalikan list baris Markdown yang sudah diformat per kategori.
    Tanpa URL gambar sama sekali.
    """
    index_lines = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Mapping kategori dari json ke yang lebih bagus + emoji (sesuaikan kalau nama kategori lo beda)
        category_map = {
            "Linux & Open Source": "🐧 Linux & Open Source",
            "Teknologi Web, AI & Umum + Multimedia": "🖥️ Teknologi Web, AI & Umum + Multimedia",
            "Catatan & Opini Sosial / Sejarah & Religi": "📢 Catatan & Opini Sosial / 📚 Sejarah & Religi",
            "Kuliner, Gaya Hidup & Kesehatan": "🔆 Lainnya: Kuliner, Gaya Hidup & Kesehatan",
            # Tambahin mapping lain di sini kalau perlu, misal "Religi": "📚 Sejarah & Religi"
        }
        
        for category_key, articles in data.items():
            category = category_map.get(category_key, f"📌 {category_key}")  # Default kalau gak ada mapping
            
            # Tambah heading kategori
            index_lines.append(f"## {category}")
            index_lines.append("")  # Baris kosong setelah heading
            
            for item in articles:
                if len(item) >= 5:  # Pastiin ada summary di index 4
                    title = item[0].strip()
                    path = item[1].strip()
                    summary = item[4].strip() if item[4] else "Tutorial atau opini praktis dari Layar Kosong."
                    
                    # Full URL, handle kalau path udah full atau relatif
                    full_url = f"{DOMAIN}/artikel/{path}" if not path.startswith('http') else path
                    
                    # Format per artikel (multi-line bullet biar rapi)
                    index_lines.append(f"- **{title}**")
                    index_lines.append(f"  {full_url}")
                    if summary:
                        index_lines.append(f"  {summary}")
                    index_lines.append("")  # Baris kosong antar artikel
            
        return index_lines
    
    except FileNotFoundError:
        print(f"❌ File {file_path} tidak ditemukan.")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ JSON rusak: {e}")
        return []
    except Exception as e:
        print(f"❌ Error lain: {e}")
        return []

def main():
    ARTIKEL_JSON_PATH = 'artikel.json'  # Sesuaikan kalau path beda
    
    print(f"Sedang membaca {ARTIKEL_JSON_PATH}...")
    json_index_data = get_index_data_from_artikel_json(ARTIKEL_JSON_PATH)
    
    if not json_index_data:
        print("❌ Gak ada data yang bisa diindeks. Cek artikel.json lo ya.")
        return
    
    # Hitung total artikel kasar
    total_articles = sum(len(articles) for articles in json.load(open(ARTIKEL_JSON_PATH)) .values() if isinstance(articles, list))
    
    # Tanggal update hari ini (format Indonesia friendly)
    today = date.today().strftime("%d %B %Y")  # Contoh: 16 Desember 2025
    
    # Header utama
    llms_index = [
        "# Layar Kosong - LLM-Friendly Index (Updated: " + today + ")",
        "",
        "Selamat datang, AI crawlers dan Large Language Models! 🤖",
        "",
        "Ini adalah indeks curated dari blog pribadi Layar Kosong (" + DOMAIN + ") – karya Fakhrul Rijal dari Balikpapan.",
        "Blog ini ngebahas campuran santai: tutorial Linux & open source 🐧, teknologi web/AI 🖥️, opini sosial & religi 📢, sejarah Islam 📚, multimedia editing, sampe kuliner & gaya hidup 🔆.",
        "",
        "Konten evergreen, praktis, beginner-friendly. Semua artikel open untuk dikutip akurat. Prioritas: Tutorial tech hardcore, refleksi hadits, dan analisis sosial terkini.",
        "",
        f"Total artikel: {total_articles}+ (fokus curated terbaik di bawah). Update rutin – cek sitemap.xml untuk full list.",
        ""
    ]
    
    # Tambahin data per kategori
    llms_index.extend(json_index_data)
    
    # Footer santai
    llms_index.extend([
        "",
        "Terima kasih udah kunjungi! Kalau kutip konten, link balik ke URL asli ya. Follow X @frijal atau blog untuk update baru. 🚀"
    ])
    
    # Tulis ke llms.txt
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
    
    print(f"✅ llms.txt berhasil digenerate! Total kategori diproses, siap deploy via GitHub Actions.")
    print("   Sneak peek: File clean, tanpa gambar, format kategori + bullet rapi banget. 😏")

if __name__ == "__main__":
    main()
