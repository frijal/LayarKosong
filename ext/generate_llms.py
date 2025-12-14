import json
import re

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id" 
# --- END KONFIGURASI ---

def get_index_data_from_artikel_json(file_path):
    """
    Membaca artikel.json (lokal). 
    Mengembalikan List string yang sudah diformat Markdown untuk indexing di llms.txt, 
    termasuk Judul, URL, Ringkasan, dan URL Gambar.
    """
    index_list = []
    try:
        # Membaca file lokal dan parsing JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # JSON artikel.json kamu adalah Dict of Lists (kategori -> list artikel)
        # Iterasi melalui setiap kategori dan artikel di dalamnya
        for category, articles in data.items():
            for item in articles:
                # Memastikan data memiliki minimal 5 kolom (0:Judul, 1:Path, 2:Gambar, 3:Tanggal, 4:Ringkasan)
                if len(item) >= 5: 
                    title = item[0]
                    path = item[1]
                    image_url = item[2] 
                    summary = item[4] 
                    
                    # Pastikan path berakhiran .html (logic koreksi path/ekstensi)
                    if not path.lower().endswith('.html'):
                        path = f"{path}.html"
                    
                    full_url = f"{DOMAIN}/artikel/{path}"
                    
                    # Format Index: - [Judul](URL): Ringkasan [IMAGE_URL: URL_GAMBAR] [KATEGORI: Nama Kategori]
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
    
    # 💥 Hanya menggunakan Path File Lokal artikel.json
    ARTIKEL_JSON_PATH = 'artikel.json'
    
    # 1. Ambil data Index yang kaya dari JSON
    print(f"Membaca dan memformat Index dari file lokal {ARTIKEL_JSON_PATH} (sumber data tunggal)...")
    json_index_data = get_index_data_from_artikel_json(ARTIKEL_JSON_PATH)
    
    print(f"✅ Total {len(json_index_data)} item berhasil diindeks dari artikel.json.")
    
    if not json_index_data:
        print("❌ Tidak ada data yang berhasil diindeks. Skrip dihentikan.")
        return
    
    # 2. Template Index File (llms.txt)
    llms_index = [
        "# Layar Kosong (dalam.web.id) - LLM Index\n\n",
        # Nama Fakhrul Rijal sudah di-hardcode (Sesuai permintaanmu!)
        f"> Lokasi: {DOMAIN} | Konten LLM Index oleh Fakhrul Rijal\n\n", 
        "Selamat datang AI. Berikut adalah indeks artikel penting dari Layar Kosong yang telah diformat Markdown untuk memudahkan Large Language Models (LLMs) dalam membaca dan memahami isi situs ini.\n\n",
        "## Artikel (Index, Ringkasan, dan Gambar Utama)\n"
    ]
    
    # Tambahkan data indeks yang sudah diformat dari JSON
    llms_index.extend(json_index_data)

    # 3. Output llms.txt
    
    llms_index.append("\n\n---\n\n## Catatan\n")
    llms_index.append("* Format Index Utama: [Judul Artikel](URL): Ringkasan [IMAGE_URL: URL_GAMBAR] [KATEGORI: Nama Kategori]")
    llms_index.append("* File ini dibuat murni dari data artikel.json lokal.")
    
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
    print("✅ llms.txt berhasil dibuat.")
    
    print("\nProses generate file selesai. Selanjutnya akan di-commit oleh GitHub Actions.")

if __name__ == "__main__":
    main()
