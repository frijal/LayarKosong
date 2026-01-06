import json
import os
import sys
import requests
from atproto import Client, client_utils, models

# --- KONFIGURASI ---
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-bluesky.txt' 
BASE_URL = 'https://dalam.web.id/artikel/'

# Credential dari GitHub Secrets / Env Vars
BSKY_HANDLE = os.getenv('BSKY_HANDLE')
BSKY_PASSWORD = os.getenv('BSKY_PASSWORD')

def main():
    if not os.path.exists(JSON_FILE):
        print(f"Error: {JSON_FILE} tidak ditemukan")
        sys.exit(1)

    # 1. Load Data
    with open(JSON_FILE, 'r') as f:
        data = json.load(f)

    # 2. Gabungkan Kategori & Flatten Data
    all_posts = []
    for category_name, posts in data.items():
        for post in posts:
            # Sesuai struktur artikel.json: 
            # 0: Judul, 1: Slug, 2: Image URL, 3: Date, 4: Desc
            slug_clean = post[1].replace('.html', '')
            all_posts.append({
                'title': post[0],
                'url': f"{BASE_URL}{slug_clean}",
                'image_url': post[2], # Langsung pakai URL dari JSON
                'date': post[3],
                'desc': post[4],
                'category': category_name
            })

    # 3. Sortir (Terbaru di Atas)
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    # 4. Cek Database
    posted_urls = []
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            posted_urls = [line.strip() for line in f.readlines()]

    # Cari artikel terbaru yang belum pernah diposting
    target_post = next((p for p in all_posts if p['url'] not in posted_urls), None)

    if not target_post:
        print("✅ Santai dulu... Tidak ada artikel baru untuk diposting.")
        return

    print(f"🚀 Memproses: {target_post['title']}")

    # 5. Login ke Bluesky
    client = Client()
    try:
        client.login(BSKY_HANDLE, BSKY_PASSWORD)
        
        # --- Bagian Card Preview (Embed) ---
        embed_external = None
        try:
            # Download gambar langsung dari URL di JSON
            img_res = requests.get(target_post['image_url'], timeout=15)
            img_res.raise_for_status()
            
            # Upload blob ke Bluesky
            upload = client.upload_blob(img_res.content)
            
            # Buat objek Card Preview
            embed_external = models.AppBskyEmbedExternal.Main(
                external=models.AppBskyEmbedExternal.External(
                    title=target_post['title'],
                    description=target_post['desc'],
                    uri=target_post['url'],
                    thumb=upload.blob
                )
            )
        except Exception as img_err:
            print(f"⚠️ Gambar gagal diproses, lanjut mode teks saja: {img_err}")

        # --- Bagian Teks & Hashtag ---
        cat_hashtag = "#" + target_post['category'].replace(" ", "").lower()
        hashtags = f"#fediverse #repost {cat_hashtag} #Indonesia"
        
        text_builder = client_utils.TextBuilder()
        text_builder.text(f"📖 {target_post['title']}\n\n{target_post['desc']}\n\n{hashtags}\n\n")
        text_builder.link(target_post['url'], target_post['url'])

        # Kirim Postingan
        client.send_post(text_builder, embed=embed_external)

        # 6. Update Database
        with open(DATABASE_FILE, 'a') as f:
            f.write(target_post['url'] + '\n')
            
        print(f"✨ SUKSES! Artikel sudah nangkring di Bluesky.")

    except Exception as e:
        print(f"❌ Ada masalah: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
