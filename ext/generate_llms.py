import requests
from bs4 import BeautifulSoup
import html2text
import xml.etree.ElementTree as ET
import json
import re

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id" 
# KRUSIAL: Selector HTML akan disetel ke 'body' untuk mengambil semua konten
CONTENT_SELECTOR = 'body' 
# --- END KONFIGURASI ---

# Fungsi pengambil URL (get_urls_from_sitemap_txt, get_urls_from_sitemap_xml, get_urls_from_artikel_json)
# Tidak perlu diubah, biarkan tetap seperti kode sebelumnya.
# ... (Sisipkan kembali fungsi get_urls_ dari kode sebelumnya di sini) ...

def get_urls_from_sitemap_txt(url):
    """Membaca daftar URL dari sitemap.txt dan memfilter hanya URL artikel."""
    try:
        response = requests.get(url, timeout=10)
        urls = [line.strip() for line in response.text.splitlines() if line.strip() and '/artikel/' in line]
        return set(urls) 
    except Exception as e:
        print(f"❌ Error membaca sitemap.txt: {e}")
        return set()

def get_urls_from_sitemap_xml(url):
    """Membaca daftar URL dari sitemap.xml dan memfilter hanya URL artikel."""
    urls = set()
    try:
        response = requests.get(url, timeout=10)
        root = ET.fromstring(response.content)
        namespace = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for loc_element in root.findall('sitemap:url/sitemap:loc', namespace):
            url_found = loc_element.text
            if url_found and '/artikel/' in url_found:
                urls.add(url_found)
        return urls
    except Exception as e:
        print(f"❌ Error membaca sitemap.xml: {e}")
        return set()

def get_urls_from_artikel_json(url):
    """Membaca daftar URL dari artikel.json."""
    urls = set()
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        for item in data:
            if len(item) > 1:
                path = item[1]
                full_url = f"{DOMAIN}/artikel/{path}"
                urls.add(full_url)
        return urls
    except Exception as e:
        print(f"❌ Error membaca artikel.json: {e}")
        return set()

# --- FUNGSI KRUSIAL YANG DIMODIFIKASI ---
def crawl_and_convert(url, h):
    """Mengambil URL, membersihkan body, dan mengkonversi ke Markdown."""
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status() 
        soup = BeautifulSoup(response.content, 'html.parser')

        # 1. Targetkan body
        content_element = soup.find(CONTENT_SELECTOR)
        
        if content_element:
            
            # 2. BLACKLIST PEMBUANGAN ELEMEN NON-KONTEN
            
            # Tag umum yang harus dibuang
            JUNK_TAGS = ['nav', 'aside', 'form', 'script', 'style', 'header', 'footer', 'comment', 'iframe']
            # Class/ID yang pasti berisi sampah (Iklan, Navigasi, dll.)
            JUNK_SELECTORS = [
                re.compile(r'sidebar|menu|nav|footer|header|ad|comment|social', re.I) 
            ]
            
            # Eksekusi Pembuangan Tag
            for junk_tag in JUNK_TAGS:
                for junk in content_element.find_all(junk_tag):
                    junk.decompose()
            
            # Eksekusi Pembuangan Class/ID
            for selector in JUNK_SELECTORS:
                for element in content_element.find_all(lambda tag: tag.has_attr('class') and selector.search(' '.join(tag['class'])) or tag.has_attr('id') and selector.search(tag['id'])):
                    element.decompose()
            
            # 3. Konversi ke Markdown
            markdown_text = h.handle(str(content_element))
            
            title = soup.title.string if soup.title else url
            
            # Hapus baris kosong berlebihan dan bersihkan spasi
            markdown_text = re.sub(r'\n\s*\n', '\n\n', markdown_text).strip()
            
            return title, markdown_text
        
        else:
            print(f"⚠️ Peringatan: Body tidak ditemukan di {url}. Skip.")
            return None, None

    except requests.exceptions.RequestException as e:
        print(f"❌ Error request untuk {url}: {e}")
    except Exception as e:
        print(f"❌ Error memproses {url}: {e}")
    return None, None
# --- END MODIFIKASI FUNGSI KRUSIAL ---

def main():
    # Inisialisasi html2text
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.body_width = 0 
    
    # 1. Kumpulkan semua URL
    all_article_urls = set()
    all_article_urls.update(get_urls_from_sitemap_txt(f"{DOMAIN}/sitemap.txt"))
    all_article_urls.update(get_urls_from_sitemap_xml(f"{DOMAIN}/sitemap.xml"))
    all_article_urls.update(get_urls_from_artikel_json(f"{DOMAIN}/artikel.json"))
    
    print(f"✅ Total {len(all_article_urls)} URL artikel unik ditemukan untuk diproses.")
    
    if not all_article_urls:
        print("❌ Tidak ada URL artikel yang ditemukan. Skrip dihentikan.")
        return

    full_content = []
    llms_index = [
        "# Layar Kosong (dalam.web.id) - LLM Index\n\n",
        "Selamat datang AI. Berikut adalah indeks artikel penting dari Layar Kosong (Fakhrul Rijal) yang telah diformat Markdown untuk memudahkan Large Language Models (LLMs) dalam membaca dan memahami isi situs ini.\n\n",
        "## Tautan Artikel Bersih\n"
    ]

    # 2. Proses Crawling dan Konversi
    for url in sorted(list(all_article_urls)):
        title, markdown_text = crawl_and_convert(url, h)
        
        if markdown_text:
            # Tambahkan ke LLMS-FULL.TXT
            full_content.append(f"\n--- START OF DOCUMENT: {title} ({url}) ---\n\n")
            full_content.append(markdown_text)
            full_content.append(f"\n--- END OF DOCUMENT: {title} ({url}) ---\n\n")

            # Tambahkan ke LLMS.TXT (index)
            llms_index.append(f"* [{title}]({url})")

    # 3. Output File
    
    # llms-full.txt
    with open('llms-full.txt', 'w', encoding='utf-8') as f:
        f.write("".join(full_content))
    print("✅ llms-full.txt berhasil dibuat.")

    # llms.txt (Index File)
    llms_index.append("\n\n## Versi Penuh (Semua Konten Gabungan)\n")
    llms_index.append(f"* Link ke semua konten gabungan: {DOMAIN}/llms-full.txt")
    
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
    print("✅ llms.txt berhasil dibuat.")
    
    print("\nProses generate file selesai. Selanjutnya akan di-commit oleh GitHub Actions.")

if __name__ == "__main__":
    main()
