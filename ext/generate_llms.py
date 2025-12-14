import requests
from bs4 import BeautifulSoup
import html2text
import xml.etree.ElementTree as ET
import json
import re

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id" 
CONTENT_SELECTOR = 'body' 

# HEADERS untuk menghindari 403 Forbidden dari server/WAF
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}
# --- END KONFIGURASI ---

def ensure_html_extension(url):
    """Memastikan URL berakhiran .html jika belum ada, dan hanya berlaku di path /artikel/."""
    # Cari path setelah domain, contoh: /artikel/nama-artikel
    path = url.replace(DOMAIN, '')
    
    # Hanya proses yang ada di folder artikel dan belum ada ekstensi
    if '/artikel/' in path and not path.lower().endswith('.html'):
        # Cek kalau ada query parameter (misal ?v=123)
        if '?' in url:
            base_url, query = url.split('?', 1)
            return f"{base_url}.html?{query}"
        else:
            return f"{url}.html"
    return url

def get_urls_from_sitemap_txt(url):
    """Membaca daftar URL dari sitemap.txt, memfilter hanya URL artikel, dan menambahkan .html jika perlu."""
    urls = set()
    try:
        response = requests.get(url, timeout=10, headers=HEADERS)
        for line in response.text.splitlines():
            url_found = line.strip()
            if url_found and '/artikel/' in url_found:
                # 🔥 Modifikasi: Terapkan penambahan .html 🔥
                urls.add(ensure_html_extension(url_found))
        return urls
    except Exception as e:
        print(f"❌ Error membaca sitemap.txt: {e}")
        return set()

def get_urls_from_sitemap_xml(url):
    """Membaca daftar URL dari sitemap.xml, memfilter hanya URL artikel, dan menambahkan .html jika perlu."""
    urls = set()
    try:
        response = requests.get(url, timeout=10, headers=HEADERS)
        response.raise_for_status() 
        
        try:
            root = ET.fromstring(response.content)
            namespace = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            for loc_element in root.findall('sitemap:url/sitemap:loc', namespace):
                url_found = loc_element.text
                if url_found and '/artikel/' in url_found:
                    # 🔥 Modifikasi: Terapkan penambahan .html 🔥
                    urls.add(ensure_html_extension(url_found))
        except ET.ParseError as e:
            print(f"❌ Error parsing sitemap.xml (XML rusak): {e}. Melanjutkan tanpa data XML.")
        return urls
    except Exception as e:
        print(f"❌ Error membaca sitemap.xml: {e}")
        return set()

def get_urls_from_artikel_json(url):
    """Membaca daftar URL dari artikel.json, memastikan URL yang terbentuk memiliki ekstensi .html (dengan penanganan error parsing)."""
    urls = set()
    try:
        response = requests.get(url, timeout=10, headers=HEADERS)
        response.raise_for_status() 
        
        try:
            data = response.json()
            for item in data:
                if len(item) > 1:
                    path = item[1]
                    
                    # Cek apakah path sudah berakhiran .html (ini hanya untuk path, belum full URL)
                    if not path.lower().endswith('.html'):
                        path = f"{path}.html"
                    
                    full_url = f"{DOMAIN}/artikel/{path}"
                    
                    # Tidak perlu ensure_html_extension lagi karena sudah di-force di level path
                    urls.add(full_url) 
        except json.JSONDecodeError as e:
             print(f"❌ Error parsing artikel.json (JSON rusak/kosong): {e}. Melanjutkan tanpa data JSON.")
        return urls
    except Exception as e:
        print(f"❌ Error membaca artikel.json: {e}")
        return set()

def crawl_and_convert(url, h):
    """Mengambil URL, membersihkan body secara agresif, dan mengkonversi ke Markdown."""
    try:
        response = requests.get(url, timeout=15, headers=HEADERS) 
        response.raise_for_status() 
        soup = BeautifulSoup(response.content, 'html.parser')

        content_element = soup.find(CONTENT_SELECTOR)
        
        if content_element:
            
            # BLACKLIST PEMBUANGAN ELEMEN NON-KONTEN (Sama seperti sebelumnya)
            JUNK_TAGS = ['nav', 'aside', 'form', 'script', 'style', 'header', 'footer', 'comment', 'iframe', 'noscript', 'img', 'svg']
            JUNK_SELECTORS = [
                re.compile(r'sidebar|menu|nav|footer|header|ad|comment|social|related|meta|promo|breadcrumb|skip', re.I) 
            ]
            
            # Eksekusi Pembuangan Tag
            for junk_tag in JUNK_TAGS:
                for junk in content_element.find_all(junk_tag):
                    junk.decompose()
            
            # Eksekusi Pembuangan Class/ID
            for selector in JUNK_SELECTORS:
                for element in content_element.find_all(lambda tag: tag.has_attr('class') and selector.search(' '.join(tag['class'])) or tag.has_attr('id') and selector.search(tag['id'])):
                    element.decompose()
            
            # Konversi ke Markdown
            markdown_text = h.handle(str(content_element))
            
            title = soup.title.string if soup.title else url
            
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


def main():
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.body_width = 0 
    
    # 1. Kumpulkan semua URL
    all_article_urls = set()
    print("Mencari URL dari sitemap.txt...")
    all_article_urls.update(get_urls_from_sitemap_txt(f"{DOMAIN}/sitemap.txt"))
    print("Mencari URL dari sitemap.xml...")
    all_article_urls.update(get_urls_from_sitemap_xml(f"{DOMAIN}/sitemap.xml"))
    print("Mencari URL dari artikel.json...")
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
            full_content.append(f"\n--- START OF DOCUMENT: {title} ({url}) ---\n\n")
            full_content.append(markdown_text)
            full_content.append(f"\n--- END OF DOCUMENT: {title} ({url}) ---\n\n")

            llms_index.append(f"* [{title}]({url})")

    # 3. Output File
    
    with open('llms-full.txt', 'w', encoding='utf-8') as f:
        f.write("".join(full_content))
    print("✅ llms-full.txt berhasil dibuat.")

    llms_index.append("\n\n## Versi Penuh (Semua Konten Gabungan)\n")
    llms_index.append(f"* Link ke semua konten gabungan: {DOMAIN}/llms-full.txt")
    
    with open('llms.txt', 'w', encoding='utf-8') as f:
        f.write("\n".join(llms_index))
    print("✅ llms.txt berhasil dibuat.")
    
    print("\nProses generate file selesai. Selanjutnya akan di-commit oleh GitHub Actions.")

if __name__ == "__main__":
    main()
