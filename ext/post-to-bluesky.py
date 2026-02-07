import json
import os
import sys
import requests
import time
import re
from atproto import Client, client_utils, models

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-bluesky.txt'
DOMAIN_URL = 'https://dalam.web.id'

def slugify(text):
    # Sinkronisasi format slug kategori
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
            # Struktur: [0:judul, 1:slug, 2:image_url, 3:date(ISO), 4:desc]
            file_name = post[1].strip()
            file_slug = file_name.replace('.html', '').replace('/', '')

            # Format URL V6.9: https://dalam.web.id/kategori/slug/
            full_url = f"{DOMAIN_URL}/{cat_slug}/{file_slug}"

            # CEK BERDASARKAN SLUG (Anti-Spam)
            if file_slug not in posted_database:
                all_posts.append({
                    'title': post[0],
                    'slug': file_slug,
                    'url': full_url,
                    'image_url': post[2],
                    'date': post[3],
                    'desc': post[4] or "Archive.",
                    'category': category_name
                })

    # Sorting Terbaru -> Lama
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    # Cari artikel terbaru yang lolos filter slug
    if all_posts:
        target_post = all_posts[0]
        target_url = target_post['url']

        # Credential Bluesky
        handle = os.getenv('BSKY_HANDLE')
        password = os.getenv('BSKY_PASSWORD')

        if not handle or not password:
            print("❌ Error: BSKY_HANDLE / BSKY_PASSWORD belum diset")
            sys.exit(1)

        client = Client()
        try:
            client.login(handle, password)

            # --- PREPARASI EMBED (CARD PREVIEW) ---
            embed_external = None
            try:
                img_res = requests.get(target_post['image_url'], timeout=10)
                if img_res.status_code == 200:
                    upload = client.upload_blob(img_res.content)
                    embed_external = models.AppBskyEmbedExternal.Main(
                        external=models.AppBskyEmbedExternal.External(
                            title=target_post['title'],
                            description=target_post['desc'],
                            uri=target_url,
                            thumb=upload.blob
                        )
                    )
            except Exception as e:
                print(f"⚠️ Gagal membuat preview gambar: {e}")

            # --- PREPARASI PESAN (DESKRIPSI SAJA) ---
            full_msg = target_post['desc']
            if len(full_msg) > 297:
                full_msg = full_msg[:297] + "..."

            # Kirim ke Bluesky
            text_builder = client_utils.TextBuilder()
            text_builder.text(full_msg)

            client.send_post(text_builder, embed=embed_external)

            # Output untuk GitHub Actions
            if 'GITHUB_OUTPUT' in os.environ:
                with open(os.environ['GITHUB_OUTPUT'], 'a') as go:
                    go.write(f"bsky_url={target_url}\n")

            # Simpan log sementara
            with open('/tmp/temp_new_url_bsky.txt', 'w') as f:
                f.write(target_url + '\n')

            print(f"✅ Berhasil posting ke Bluesky: {target_url}")
            time.sleep(2)

        except Exception as e:
            print(f"❌ Error Bluesky: {e}")
            sys.exit(1)
    else:
        print("✅ Misi selesai! Tidak ada artikel baru (berdasarkan slug) untuk Bluesky.")

if __name__ == "__main__":
    main()
