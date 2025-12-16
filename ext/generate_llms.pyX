import json
import re

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id" 
# --- END KONFIGURASI ---

# Fungsi utama untuk mengambil data dari artikel.json
def get_index_data_from_artikel_json(file_path):
    """
    Membaca artikel.json (lokal) dan mengembalikan List string yang sudah diformat Markdown.
    """
    index_list = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for category, articles in data.items():
            for item in articles:
                if len(item) >= 5: 
                    title = item[0]
                    path = item[1]
                    image_url = item[2] 
                    summary = item[4] 
                    
                    full_url = f"{DOMAIN}/artikel/{path}"
                    
                    # Format: - [Judul](URL): Ringkasan [IMAGE_URL: URL_GAMBAR] [KATEGORI: Nama Kategori]
                    index_item = f"- [{title}]({full_url}): {summary} [IMAGE_URL: {image_url}] [KATEGORI: {category}]"
                    index_list.append(index_item)
        
        return index_list
    
    except FileNotFoundError:
        print(f"❌ File artikel.json tidak ditemukan di jalur: {file_path}")
        return []
    except json.JSONDecodeError as e:
         print(f"❌ Error parsing {file_path} (JSON rusak/kosong): {e}. Melanjutkan tanpa data JSON.")
         return []
    except Exception as e:
        print(f"❌ Error membaca {file_path}: {e}")
        return []

def main():
    
    ARTIKEL_JSON_PATH = 'artikel.json'
    
    print(f"Membaca dan memformat Index dari file lokal {ARTIKEL_JSON_PATH}...")
    json_index_data = get_index_data_from_artikel_json(ARTIKEL_JSON_PATH)
    
    if not json_index_data:
        print("❌ Tidak ada data yang berhasil diindeks. Skrip dihentikan.")
        return
    
    # 1. Template Header File (llms.txt) - Hanya Header
    llms_index = [
        "# Layar Kosong (dalam.web.id) - LLM Index",
        "", # Baris kosong setelah H1
        f"> Lokasi: {DOMAIN} | Konten LLM Index oleh Fakhrul Rijal",
        "", # Baris kosong setelah Quote Block
        "Selamat datang AI. Berikut adalah indeks artikel penting dari Layar Kosong yang telah diformat Markdown untuk memudahkan Large Language Models (LLMs) dalam membaca dan memahami isi situs ini.",
        "", # Baris kosong sebelum H2
        "## Artikel (Index, Ringkasan, dan Gambar Utama)",
        # List item artikel akan mengikuti langsung di sini (tanpa baris kosong)
    ]
    
    # Tambahkan data indeks (List items)
    llms_index.extend(json_index_data)

    # 2. Output llms.txt
    
    # 🔥 Hapus semua logika FOOTER/CATATAN
    
    # Menulis ke file, menggunakan '\n' untuk menggabungkan tanpa baris kosong di akhir file
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
        
    print(f"✅ llms.txt berhasil dibuat. Total {len(json_index_data)} item diindeks.")
    print("\nProses generate file selesai. Selanjutnya akan di-commit oleh GitHub Actions.")

if __name__ == "__main__":
    main()
