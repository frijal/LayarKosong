import os
import sys
import json
import re
from bs4 import BeautifulSoup
import glob

def fix_url(url):
    if isinstance(url, str) and url.startswith('http'):
        # Menghapus trailing slash tapi jangan sampai merusak domain utama (misal: https://dalam.web.id/)
        # Jika URL hanya https://domain.com/ maka biarkan, jika https://domain.com/path/ maka hapus /
        if len(url.split('/')) > 3:
            return url.rstrip('/')
    return url

def process_json_ld(data):
    """Fungsi rekursif untuk membersihkan URL di dalam dict/list JSON-LD"""
    if isinstance(data, dict):
        for key, value in data.items():
            data[key] = process_json_ld(value)
    elif isinstance(data, list):
        return [process_json_ld(item) for item in data]
    elif isinstance(data, str):
        return fix_url(data)
    return data

def clean_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pakai BeautifulSoup untuk manipulasi tag HTML
    soup = BeautifulSoup(content, 'html.parser')
    changed = False

    # 1. Perbaiki link canonical
    canonical = soup.find('link', rel='canonical')
    if canonical and canonical.get('href'):
        old_href = canonical['href']
        new_href = fix_url(old_href)
        if old_href != new_href:
            canonical['href'] = new_href
            changed = True

    # 2. Perbaiki meta og:url
    og_url = soup.find('meta', property='og:url')
    if og_url and og_url.get('content'):
        old_content = og_url['content']
        new_content = fix_url(old_content)
        if old_content != new_content:
            og_url['content'] = new_content
            changed = True

    # 3. Perbaiki URL di dalam JSON-LD (Sangat Penting untuk SEO Google)
    json_scripts = soup.find_all('script', type='application/ld+json')
    for script in json_scripts:
        try:
            data = json.loads(script.string)
            updated_data = process_json_ld(data)
            new_json_str = json.dumps(updated_data, ensure_ascii=False, separators=(',', ':'))
            if script.string != new_json_str:
                script.string.replace_with(new_json_str)
                changed = True
        except Exception as e:
            print(f"⚠️ Gagal proses JSON-LD di {file_path}: {e}")

    if changed:
        # Tulis kembali hasil modifikasi
        with open(file_path, 'w', encoding='utf-8') as f:
            # Menggunakan str(soup) pada file minified terkadang menambah spasi
            # Jika ingin tetap super-minify, kita bisa pakai formatter=None
            f.write(str(soup))
        return True
    return False

def main():
    target_folder = sys.argv[1] if len(sys.argv) > 1 else 'artikel'
    files = glob.glob(f"{target_folder}/**/*.html", recursive=True)
    
    print(f"🧐 Memeriksa {len(files)} file minified...")
    count = 0
    for f in files:
        if clean_html_file(f):
            print(f"✅ Fixed: {f}")
            count += 1
    
    print(f"\n✨ Selesai! {count} file diperbarui.")

if __name__ == "__main__":
    main()
