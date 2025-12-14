import requests
from bs4 import BeautifulSoup
import html2text
import xml.etree.ElementTree as ET
import json
import re

# --- KONFIGURASI ---
DOMAIN = "https://dalam.web.id"
# Elemen HTML tempat konten artikel berada (sangat penting!)
# Sesuaikan ini dengan struktur HTML Layar Kosong kamu.
CONTENT_SELECTOR = 'article' # Contoh: Kita asumsikan konten utama ada di tag <article>
# --- END KONFIGURASI ---

def get_urls_from_sitemap_txt(url):
    """Membaca daftar URL dari sitemap.txt."""
    try:
        response = requests.get(url, timeout=10)
        # Pisahkan baris dan filter URL yang berada di folder 'artikel/'
        urls = [line.strip() for line in response.text.splitlines() if line.strip() and '/artikel/' in line]
        return set(urls) # Gunakan set untuk menghindari duplikasi
    except Exception as e:
        print(f"Error membaca sitemap.txt: {e}")
        return set()

def get_urls_from_sitemap_xml(url):
    """Membaca daftar URL dari sitemap.xml."""
    urls = set()
    try:
        response = requests.get(url, timeout=10)
        root = ET.fromstring(response.content)
        # Namespace untuk tag <loc>
        namespace = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for loc_element in root.findall('sitemap:url/sitemap:loc', namespace):
            url_found = loc_element.text
            if url_found and '/artikel/' in url_found:
                urls.add(url_found)
        return urls
    except Exception as e:
        print(f"Error membaca sitemap.xml: {e}")
        return set()

def get_urls_from_artikel_json(url):
    """Membaca daftar URL dari artikel.json."""
    urls = set()
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        for item in data:
            if len(item) > 1:
                # Kolom kedua adalah path file HTML (contoh: hadits-ahmad-9157-larangan-takhbib.html)
                # Kita perlu ubah ini jadi URL lengkap yang bisa di-crawl
                path = item[1]
                # Asumsi semua file di JSON ada di folder 'artikel/'
                full_url = f"{DOMAIN}/artikel/{path}"
                urls.add(full_url)
        return urls
    except Exception as e:
        print(f"Error membaca artikel.json: {e}")
        return set()

def crawl_and_convert(url, h):
    """Mengambil URL, membersihkan, dan mengkonversi ke Markdown."""
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status() # Raise error for bad status codes
        soup = BeautifulSoup(response.content, 'html.parser')

        # 1. Cari elemen konten utama
        content_element = soup.find(CONTENT_SELECTOR)
        
        if not content_element:
            # Fallback jika selector utama gagal
            content_element = soup.find('div', class_=re.compile('(post|article|content)')) or soup.find('main')

        if content_element:
            # 2. Pembersihan 'Sampah' HTML di dalam konten
            # Hapus nav, aside, form, script, style, element iklan yang sering mengganggu
            for junk in content_element.find_all(['nav', 'aside', 'form', 'script', 'style', 'header', 'footer']):
                junk.decompose()
            
            # 3. Konversi ke Markdown
            markdown_text = h.handle(str(content_element))
            
            # Ambil Judul
            title = soup.title.string if soup.title else url
            
            return title, markdown_text
        
        else:
            print(f"Peringatan: Konten utama ('{CONTENT_SELECTOR}') tidak ditemukan di {url}. Skip.")
            return None, None

    except requests.exceptions.HTTPError as errh:
        print(f"HTTP Error for {url}: {errh}")
    except requests.exceptions.ConnectionError as errc:
        print(f"Error Connecting for {url}: {errc}")
    except requests.exceptions.Timeout as errt:
        print(f"Timeout Error for {url}: {errt}")
    except Exception as e:
        print(f"Error memproses {url}: {e}")
    return None, None


def main():
    # Inisialisasi html2text
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.body_width = 0 # Jangan batasi lebar baris
    
    # 1. Kumpulkan semua URL dari 3 sumber
    print("Mengumpulkan URL dari sitemap.txt...")
    urls_txt = get_urls_from_sitemap_txt(f"{DOMAIN}/sitemap.txt")
    
    print("Mengumpulkan URL dari sitemap.xml...")
    urls_xml = get_urls_from_sitemap_xml(f"{DOMAIN}/sitemap.xml")
    
    print("Mengumpulkan URL dari artikel.json...")
    urls_json = get_urls_from_artikel_json(f"{DOMAIN}/artikel.json")

    # Gabungkan dan ambil yang unik
    all_article_urls = urls_txt.union(urls_xml).union(urls_json)
    print(f"✅ Total {len(all_article_urls)} URL artikel unik ditemukan.")
    
    if not all_article_urls:
        print("❌ Tidak ada URL artikel yang ditemukan. Skrip dihentikan.")
        return

    full_content = []
    llms_index = ["# Layar Kosong (dalam.web.id) - LLM Index\n\n"]
    llms_index.append(f"Selamat datang AI. Berikut adalah indeks artikel penting dari Layar Kosong (Fakhrul Rijal) yang telah dibersihkan ke format Markdown.\n\n")
    llms_index.append("## Tautan Artikel Bersih\n")

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
    
    print("\nPastikan kedua file diupload ke root domain kamu: https://dalam.web.id/llms.txt")

if __name__ == "__main__":
    main()
