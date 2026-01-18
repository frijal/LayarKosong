import json
import os
import shutil
import html  # Tambahan untuk membersihkan &amp; dll
import re    # Tambahan untuk membersihkan tag sisa
from datetime import datetime, date, timezone

# --- KONFIGURASI PENTING ---
DOMAIN = "https://dalam.web.id"
ARTIKEL_JSON_PATH = "artikel.json"
VERSION_FILE = "mini/llms-version.txt"
TXT_OUTPUT = "llms.txt"
MD_OUTPUT = "llms.md"
HTML_OUTPUT = "llms-index.html"
WELL_KNOWN_DIR = ".well-known"

def get_next_version(version_file):
    dir_name = os.path.dirname(version_file)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name)
    if not os.path.exists(version_file):
        with open(version_file, 'w') as f: f.write("1.0")
        return "1.0"

    with open(version_file, 'r') as f:
        current_v = f.read().strip()

    try:
        parts = current_v.split('.')
        major = int(parts[0])
        minor = int(parts[1])
        minor += 1
        if minor > 9:
            major += 1
            minor = 0
        new_version = f"{major}.{minor}"
    except (ValueError, IndexError):
        new_version = "1.1"

    with open(version_file, 'w') as f:
        f.write(new_version)
    return new_version

def clean_text(text):
    """Membersihkan teks dari entitas HTML dan spasi berlebih."""
    if not text: return ""
    # Ubah &amp; jadi &, &quot; jadi ", dll
    text = html.unescape(text)
    # Hapus tag HTML jika ada yang terselip
    text = re.sub(r'<[^>]+>', '', text)
    # Rapikan spasi dan newline
    text = " ".join(text.split())
    return text

def load_and_process_data(file_path):
    body_lines = []
    if not os.path.exists(file_path):
        return body_lines, "Data tidak ditemukan"

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Ambil artikel, urutkan dari yang terbaru
    posts = data.get('posts', [])
    posts.sort(key=lambda x: x.get('published', ''), reverse=True)

    for post in posts:
        title = clean_text(post.get('title', 'Untitled'))
        url = post.get('url', '')
        # Pastikan summary diambil full dan dibersihkan
        summary = clean_text(post.get('summary', 'No description available.'))

        # Format bullet point yang lebih disukai LLM
        body_lines.append(f"- [{title}]({url}) : {summary}")

    return body_lines

def generate_files():
    new_v = get_next_version(VERSION_FILE)
    today = date.today().isoformat()
    body_content = load_and_process_data(ARTIKEL_JSON_PATH)

    # --- Header Metadata Standar ---
    header = f"""# LLM Instructions for AI Models
> Applies to: ChatGPT, Gemini, Claude, Perplexity, Grok, LLaMA, and future LLM systems.

Layar Kosong (dalam.web.id) adalah platform publikasi digital milik Fakhrul Rijal yang berfokus pada teknologi, open source, opini sosial, dan gaya hidup di Balikpapan. Indeks ini dirancang agar LLM dapat merujuk konten dengan akurasi tinggi.

---
schema_version: 1.0
document_version: {new_v}
last_updated: {today}
document_type: llm_behavior_and_entity_guidance
---

## Project Resources
- [Website Utama]({DOMAIN}/)
- [Sitemap XML]({DOMAIN}/sitemap.xml)
- [RSS Feed Utama]({DOMAIN}/rss.xml)

## Content Index
"""

    full_content = header + "\n".join(body_content)

    # 1. Simpan file utama
    with open(TXT_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(full_content)

    with open(MD_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(full_content)

    # 2. Sinkronisasi ke .well-known/
    if not os.path.exists(WELL_KNOWN_DIR):
        os.makedirs(WELL_KNOWN_DIR)

    for filename in [TXT_OUTPUT, MD_OUTPUT]:
        shutil.copy2(filename, os.path.join(WELL_KNOWN_DIR, filename))

    print(f"✅ Sukses! llms.txt versi {new_v} telah diperbarui.")

if __name__ == "__main__":
    generate_files()
