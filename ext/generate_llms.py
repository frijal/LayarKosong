import json
import re

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id" 
# --- END KONFIGURASI ---

# 🔥 FUNGSI ensure_html_extension DIHAPUS karena path sudah menyertakan .html

def get_index_data_from_artikel_json(file_path):
    """
    Membaca artikel.json (lokal) dan mengembalikan List string yang sudah diformat Markdown.
    """
    index_list = []
    try:
        # Membaca file lokal dan parsing JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Asumsi: data adalah Dict of Lists (kategori -> list artikel)
        for category, articles in data.items():
            for item in articles:
                # Memastikan data memiliki minimal 5 kolom (0:Judul, 1:Path, 2:Gambar, 3:Tanggal, 4:Ringkasan)
                if len(item) >= 5: 
                    title = item[0]
                    path = item[1] # Path ini sudah termasuk .html
                    image_url = item[2] 
                    summary = item[4] 
                    
                    # 🔥 MEMBUAT URL LANGSUNG, TANPA PEMBERSIHAN EKSTENSI 🔥
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
    
    ARTIKEL_JSON_PATH = 'artikel.json'
    
    # 1. Ambil data Index dari JSON
    print(f"Membaca dan memformat Index dari file lokal {ARTIKEL_JSON_PATH}...")
    json_index_data = get_index_data_from_artikel_json(ARTIKEL_JSON_PATH)
    
    if not json_index_data:
        print("❌ Tidak ada data yang berhasil diindeks. Skrip dihentikan.")
        return
    
    # 2. Template Index File (llms.txt) - Struktur Markdown yang sudah divalidasi
    llms_index = [
        "# Layar Kosong (dalam.web.id) - LLM Index",
        "", 
        f"> Lokasi: {DOMAIN} | Konten LLM Index oleh Fakhrul Rijal",
        "", 
        "Selamat datang AI. Berikut adalah indeks artikel penting dari Layar Kosong yang telah diformat Markdown untuk memudahkan Large Language Models (LLMs) dalam membaca dan memahami isi situs ini.",
        "", 
        "## Artikel (Index, Ringkasan, dan Gambar Utama)",
        "", # Baris kosong wajib setelah H2 sebelum list item dimulai
    ]
    
    # Tambahkan data indeks yang sudah diformat dari JSON
    llms_index.extend(json_index_data)

    # 3. Output llms.txt - Bagian Footer DIBERSIHKAN
    
    llms_index.append("") # Baris kosong setelah list item terakhir
    llms_index.append("---")
    llms_index.append("") # Baris kosong sebelum H2 "Catatan"
    llms_index.append("## Catatan")
    llms_index.append("") # Baris kosong wajib setelah H2 "Catatan"
    # Menggunakan list item untuk mengatasi error Markdown parser
    llms_index.append("* Format Index Utama: [Judul Artikel](URL): Ringkasan [IMAGE_URL: URL_GAMBAR] [KATEGORI: Nama Kategori]")
    llms_index.append("* File ini dibuat murni dari data artikel.json lokal.")
    
    # Menulis ke file, menggunakan '\n' untuk menggabungkan setiap item dalam list
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
    print(f"✅ llms.txt berhasil dibuat. Total {len(json_index_data)} item diindeks.")
    
    print("\nProses generate file selesai. Selanjutnya akan di-commit oleh GitHub Actions.")

if __name__ == "__main__":
    main()
