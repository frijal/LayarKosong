import os
import glob
from bs4 import BeautifulSoup
from datetime import datetime

# Konfigurasi
FOLDERS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"]
REPORT_PATH = f"mini/laporan-audit-{datetime.now().strftime('%Y%m%d')}.md"

def audit_files():
    # Menggunakan dictionary untuk menampung baris tabel per kategori
    results = {i: [] for i in range(1, 7)}
    
    html_files = []
    for folder in FOLDERS:
        html_files.extend(glob.glob(f"./{folder}/**/*.html", recursive=True))

    for file_path in html_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            issues = {i: [] for i in range(1, 7)}

            # 1. CORE & BRANDING
            if not soup.find("link", rel="canonical"): issues[1].append("Canonical Tag")
            if not soup.find("link", rel="icon", href="/favicon.ico"): issues[1].append("Favicon.ico")
            if not soup.find("meta", attrs={"name": "author", "content": "Fakhrul Rijal"}): issues[1].append("Author")
            if not soup.find("meta", attrs={"name": "theme-color", "content": "#00b0ed"}): issues[1].append("Theme Color")
            if not soup.find("link", rel="license"): issues[1].append("CC0 License Link")
            if not soup.find("meta", attrs={"name": "robots"}): issues[1].append("Robots Meta")
            if not soup.find("meta", attrs={"name": "googlebot"}): issues[1].append("Googlebot Meta")

            # 2. SOCIAL CREATORS
            if not soup.find("meta", attrs={"name": "fediverse:creator"}): issues[2].append("Fediverse Creator")
            if not soup.find("meta", attrs={"name": "twitter:creator"}): issues[2].append("X Creator")
            if not soup.find("meta", attrs={"name": "bluesky:creator"}): issues[2].append("Bluesky Creator")

            # 3. OPEN GRAPH (OG)
            if not soup.find("meta", attrs={"property": "og:site_name"}): issues[3].append("OG Site Name")
            if not soup.find("meta", attrs={"property": "og:locale", "content": "id_ID"}): issues[3].append("OG Locale")
            if not soup.find("meta", attrs={"property": "og:type", "content": "article"}): issues[3].append("OG Type Article")
            if not soup.find("meta", attrs={"property": "og:url"}): issues[3].append("OG URL")
            if not soup.find("meta", attrs={"property": "og:title"}): issues[3].append("OG Title")
            if not soup.find("meta", attrs={"property": "fb:app_id"}): issues[3].append("FB App ID")

            # 4. TWITTER & FACEBOOK ARTICLE
            if not soup.find("meta", attrs={"name": "twitter:card"}): issues[4].append("X Card")
            if not soup.find("meta", attrs={"name": "twitter:site"}): issues[4].append("X Site")
            if not soup.find("meta", attrs={"property": "article:author"}): issues[4].append("Article Author (FB)")
            if not soup.find("meta", attrs={"property": "article:publisher"}): issues[4].append("Article Publisher (FB)")

            # 5. IMAGES (OG, X, Itemprop, Body Alt)
            if not soup.find("meta", attrs={"property": "og:image"}): issues[5].append("OG Image")
            if not soup.find("meta", attrs={"property": "og:image:width", "content": "1200"}): issues[5].append("OG Image Width")
            if not soup.find("meta", attrs={"name": "twitter:image"}): issues[5].append("X Image")
            if not soup.find("meta", attrs={"itemprop": "image"}): issues[5].append("Itemprop Image")
            
            # Cek jika ada img tanpa alt di body
            imgs_no_alt = [img for img in soup.find_all('img') if not img.get('alt')]
            if imgs_no_alt: issues[5].append(f"{len(imgs_no_alt)} Image(s) missing Alt text")

            # 6. ASSETS & DESCRIPTIONS
            if not soup.find("link", type="application/rss+xml"): issues[6].append("RSS Feed Link")
            if not soup.find("script", type="application/ld+json"): issues[6].append("Schema JSON-LD")
            if not soup.find("meta", attrs={"name": "description"}): issues[6].append("Meta Description")

            # Masukkan ke hasil akhir
            for cat, errs in issues.items():
                if errs:
                    results[cat].append(f"| `{file_path}` | {'<br>'.join(errs)} |")

    # Tulis Laporan dengan format <details>
    with open(REPORT_PATH, 'w', encoding='utf-8') as r:
        r.write(f"# 📋 Hasil Audit SEO Layar Kosong\n")
        r.write(f"📅 Tanggal Audit: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        titles = {
            1: "🏷️ Core Meta & Branding",
            2: "🌐 Social Meta & Creators",
            3: "📊 Open Graph (OG) Tags",
            4: "🐦 X & Article Meta",
            5: "🖼️ Image Meta & Alt Text",
            6: "🛠️ Assets & Descriptions"
        }

        for cat, lines in results.items():
            r.write(f"<details>\n<summary><b>{titles[cat]} ({len(lines)} Masalah)</b></summary>\n\n")
            r.write(f"| File | Masalah Terdeteksi |\n| :--- | :--- |\n")
            r.write("\n".join(lines) if lines else "| - | ✅ Semua beres |")
            r.write("\n\n</details>\n\n")

if __name__ == "__main__":
    audit_files()
