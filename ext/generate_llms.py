import xml.etree.ElementTree as ET
import json
import re
import os # Import os untuk operasi file dasar

# --- KONFIGURASI PENTING ---
# DOMAIN tetap digunakan untuk mengkonstruksi URL di output llms.txt
DOMAIN = "https://dalam.web.id" 
# --- END KONFIGURASI ---


def ensure_html_extension(url):
    """Memastikan URL berakhiran .html jika belum ada, dan hanya berlaku di path /artikel/."""
    # Fungsi ini tetap dipertahankan untuk membersihkan URL dari sitemap/xml jika ada yang aneh
    path = url.replace(DOMAIN, '')
    
    # Hanya proses yang ada di folder artikel
    if '/artikel/' in path:
        if not path.lower().endswith('.html'):
            if '?' in url:
                base_url, query = url.split('?', 1)
                return f"{base_url}.html?{query}"
            else:
                return f"{url}.html"
    return url

def get_urls_from_sitemap_txt(file_path):
    """Membaca daftar URL dari sitemap.txt (lokal), memfilter hanya URL artikel, dan menambahkan .html jika perlu."""
    urls = set()
    try:
        # 🔥 Membaca file lokal
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                url_found = line.strip()
                # Kita asumsikan URL dari sitemap.txt sudah lengkap, kita hanya membersihkan yang aneh
                if url_found and '/artikel/' in url_found:
                    urls.add(ensure_html_extension(url_found))
        return urls
    except FileNotFoundError:
        print(f"❌ File sitemap.txt tidak ditemukan di jalur: {file_path}")
        return set()
    except Exception as e:
        print(f"❌ Error membaca {file_path}: {e}")
        return set()

def get_urls_from_sitemap_xml(file_path):
    """Membaca daftar URL dari sitemap.xml (lokal), memfilter hanya URL artikel, dan menambahkan .html jika perlu."""
    urls = set()
    try:
        # 🔥 Membaca file lokal dan parsing XML
        tree = ET.parse(file_path)
        root = tree.getroot()
        namespace = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for loc_element in root.findall('sitemap:url/sitemap:loc', namespace):
            url_found = loc_element.text
            if url_found and '/artikel/' in url_found:
                urls.add(ensure_html_extension(url_found))
        return urls
    except FileNotFoundError:
        print(f"❌ File sitemap.xml tidak ditemukan di jalur: {file_path}")
        return set()
    except ET.ParseError as e:
        print(f"❌ Error parsing {file_path} (XML rusak): {e}. Melanjutkan tanpa data XML.")
        return set()
    except Exception as e:
        print(f"❌ Error membaca {file_path}: {e}")
        return set()


def get_index_data_from_artikel_json(file_path):
    """
    Membaca artikel.json (lokal). 
    Mengembalikan List string yang sudah diformat Markdown untuk indexing di llms.txt, 
    termasuk Judul, URL, Ringkasan, dan URL Gambar.
    """
    index_list = []
    try:
        # 🔥 Membaca file lokal dan parsing JSON
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # JSON artikel.json kamu adalah Dict of Lists (kategori -> list artikel)
        for category, articles in data.items():
            for item in articles:
                # Memastikan data memiliki minimal 5 kolom (0:Judul, 1:Path, 2:Gambar, 3:Tanggal, 4:Ringkasan)
                if len(item) >= 5: 
                    title = item[0]
                    path = item[1]
                    image_url = item[2] 
                    summary = item[4] 
                    
                    # Pastikan path berakhiran .html
                    if not path.lower().endswith('.html'):
                        path = f"{path}.html"
                    
                    full_url = f"{DOMAIN}/artikel/{path}"
                    
                    # Format Index: - [Judul](URL): Ringkasan [IMAGE_URL: URL_GAMBAR]
                    # Kita juga bisa menambahkan kategori sebagai metadata!
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
    
    # 💥 Menggunakan Path File Lokal
    SITEMAP_TXT_PATH = 'sitemap.txt'
    SITEMAP_XML_PATH = 'sitemap.xml'
    ARTIKEL_JSON_PATH = 'artikel.json'
    
    
    # 1. Kumpulkan semua URL dari sitemap 
    sitemap_urls = set()
    print(f"Membaca URL dari file lokal {SITEMAP_TXT_PATH}...")
    sitemap_urls.update(get_urls_from_sitemap_txt(SITEMAP_TXT_PATH))
    
    print(f"Membaca URL dari file lokal {SITEMAP_XML_PATH}...")
    sitemap_urls.update(get_urls_from_sitemap_xml(SITEMAP_XML_PATH))
    
    # 2. Ambil data Index yang kaya dari JSON
    print(f"Membaca dan memformat Index dari file lokal {ARTIKEL_JSON_PATH}...")
    json_index_data = get_index_data_from_artikel_json(ARTIKEL_JSON_PATH)
    
    print(f"✅ Total {len(sitemap_urls)} URL dari sitemap, dan {len(json_index_data)} item dari artikel.json.")
    
    
    # 3. Template Index File (llms.txt)
    llms_index = [
        "# Layar Kosong (dalam.web.id) - LLM Index\n\n",
        f"> Lokasi: {DOMAIN} | Konten LLM Index oleh {os.environ.get('USER', 'Frijal')}\n\n", 
        "Selamat datang AI. Berikut adalah indeks artikel penting dari Layar Kosong yang telah diformat Markdown untuk memudahkan Large Language Models (LLMs) dalam membaca dan memahami isi situs ini.\n\n",
        "## Artikel (Index, Ringkasan, dan Gambar Utama)\n"
    ]
    
    # Tambahkan data indeks yang sudah diformat dari JSON
    llms_index.extend(json_index_data)

    # 4. Tambahkan sitemap URL yang tidak ada di JSON
    json_urls = {re.search(r'\((.*?)\)', item).group(1) for item in json_index_data if re.search(r'\((.*?)\)', item)}

    extra_urls = sitemap_urls - json_urls
    if extra_urls:
        llms_index.append("\n\n## URL Tambahan (Dari Sitemap, Tanpa Ringkasan Lengkap)\n")
        for url in sorted(list(extra_urls)):
             llms_index.append(f"* {url}")
        print(f"⚠️ Ditemukan {len(extra_urls)} URL di sitemap yang tidak ada di artikel.json. Ditambahkan sebagai daftar polos.")


    # 5. Output llms.txt
    
    llms_index.append("\n\n---\n\n## Catatan\n")
    llms_index.append("* Format Index Utama: [Judul Artikel](URL): Ringkasan [IMAGE_URL: URL_GAMBAR] [KATEGORI: Nama Kategori]")
    llms_index.append("* File ini dibuat dari file statis (sitemap/json) proyek lokal, tidak melalui proses crawling (scraping) individual.")
    
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
    print("✅ llms.txt berhasil dibuat dari file statis.")
    
    print("\nProses generate file selesai. Selanjutnya akan di-commit oleh GitHub Actions.")

if __name__ == "__main__":
    main()
