import json
import urllib.parse
import os
import sys
import re

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-facebook.txt'
DOMAIN_URL = 'https://dalam.web.id'

def slugify(text):
    # Pastikan ada indentasi 4 spasi di bawah ini
    text = text.strip().lower()
    text = re.sub(r'\s+', '-', text)
    return text

def main():
    if not os.path.exists(JSON_FILE):
        print("Error: artikel.json tidak ditemukan")
        sys.exit(1)

    # Load data
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # --- LOAD DATABASE (Cek sebagai string untuk filter Slug) ---
    posted_database = ""
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            posted_database = f.read()

    # Gabungkan semua kategori
    all_posts = []
    for category_name, posts in data.items():
        cat_slug = slugify(category_name)

        for post in posts:
            # Struktur: [0:judul, 1:slug, 2:image, 3:date(ISO), 4:desc]
            file_name = post[1].strip()
            file_slug = file_name.replace('.html', '').replace('/', '')

            # --- FILTER AGREGAT: Gunakan continue untuk skip ke artikel berikutnya ---
            if file_slug.startswith("agregat-20"):
                continue

            # Format URL V6.9
            full_url = f"{DOMAIN_URL}/{cat_slug}/{file_slug}"

            # CEK BERDASARKAN SLUG (Anti-Spam)
            if file_slug not in posted_database:
                all_posts.append({
                    'title': post[0],
                    'slug': file_slug,
                    'url': full_url,
                    'date': post[3],
                    'desc': post[4] or "Archive.",
                    'category': category_name
                })

    # Sorting Terbaru -> Lama
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    if all_posts:
        target_post = all_posts[0]
        target_url = target_post['url']

        desc = target_post['desc']
        cat_raw = target_post['category']

        cat_hashtag = "#" + cat_raw.replace(" ", "").lower()
        hashtags = f"#fediverse #Repost #Ngopi {cat_hashtag} #Indonesia"

        full_msg = f"{desc}\n\n{target_post['title']}\n\n{hashtags}\n\n{target_url}"
        encoded_msg = urllib.parse.quote(full_msg)

        # Output untuk GitHub Actions
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as go:
                go.write(f"url={target_url}\n")
                go.write(f"encoded_msg={encoded_msg}\n")

        # Simpan URL sementara
        with open('/tmp/temp_new_url_facebook.txt', 'w') as f:
            f.write(target_url + '\n')

        print(f"✅ Berhasil memproses: {target_url}")
    else:
        print("✅ Tidak ada artikel baru untuk Facebook.")

if __name__ == "__main__":
    main()
