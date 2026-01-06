import json
import os
import sys
import requests
import time
from atproto import Client, client_utils, models

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-bluesky.txt'
BASE_URL = 'https://dalam.web.id/artikel/'

def main():
    if not os.path.exists(JSON_FILE):
        print("Error: artikel.json tidak ditemukan")
        sys.exit(1)

    # Load data
    with open(JSON_FILE, 'r') as f:
        data = json.load(f)

    # Gabungkan semua kategori & Flatten data
    all_posts = []
    for category_name, posts in data.items():
        for post in posts:
            # Struktur: [0:judul, 1:slug, 2:image_url, 3:date(ISO), 4:desc]
            slug = post[1].replace('.html', '')
            all_posts.append({
                'title': post[0],
                'slug': slug,
                'image_url': post[2],
                'date': post[3],
                'desc': post[4],
                'category': category_name
            })

    # Sorting Terbaru -> Lama
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    # Load database
    posted_urls = []
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            posted_urls = [line.strip() for line in f.readlines()]

    # Cari artikel terbaru yang belum diposting
    target_post = None
    target_url = None
    for post in all_posts:
        url = f"{BASE_URL}{post['slug']}"
        if url not in posted_urls:
            target_post = post
            target_url = url
            break

    if target_post:
        # Credential Bluesky
        handle = os.getenv('BSKY_HANDLE')
        password = os.getenv('BSKY_PASSWORD')

        client = Client()
        try:
            client.login(handle, password)
            
            # --- PREPARASI EMBED (CARD PREVIEW) ---
            # Kita download gambar untuk dijadikan preview agar link tidak perlu ditulis manual
            embed_external = None
            try:
                img_res = requests.get(target_post['image_url'], timeout=10)
                if img_res.status_code == 200:
                    upload = client.upload_blob(img_res.content)
                    embed_external = models.AppBskyEmbedExternal.Main(
                        external=models.AppBskyEmbedExternal.External(
                            title=target_post['title'],
                            description=target_post['desc'][:150] + "...",
                            uri=target_url,
                            thumb=upload.blob
                        )
                    )
            except Exception as e:
                print(f"⚠️ Gagal membuat preview gambar: {e}")

            # --- PREPARASI PESAN (TEXT) ---
            cat_hashtag = "#" + target_post['category'].replace(" ", "").lower()
            hashtags = f"#fediverse #repost {cat_hashtag} #Indonesia"
            
            # Potong deskripsi jika kepanjangan (Limit Bluesky 300)
            clean_desc = target_post['desc']
            if len(clean_desc) > 180:
                clean_desc = clean_desc[:177] + "..."

            # Gabungkan pesan (Tanpa menuliskan Link Mentah di body teks untuk hemat karakter)
            full_msg = f"📖 {target_post['title']}\n\n{clean_desc}\n\n{hashtags}"

            # Kirim ke Bluesky
            # Kita gunakan TextBuilder untuk memastikan hashtag terdeteksi otomatis
            text_builder = client_utils.TextBuilder()
            text_builder.text(full_msg)
            
            client.send_post(text_builder, embed=embed_external)

            # Output untuk GitHub Actions (mengikuti pola skrip Facebook-mu)
            if 'GITHUB_OUTPUT' in os.environ:
                with open(os.environ['GITHUB_OUTPUT'], 'a') as go:
                    go.write(f"bsky_url={target_url}\n")

            # Simpan log lokal
            with open('temp_new_url_bsky.txt', 'w') as f:
                f.write(target_url + '\n')

            print(f"✅ Berhasil posting ke Bluesky: {target_url}")
            
            # Berikan waktu tunggu singkat agar tidak dianggap spam/bot brutal
            time.sleep(2)

        except Exception as e:
            print(f"❌ Error Bluesky: {e}")
            sys.exit(1)
    else:
        print("✅ Misi selesai! Tidak ada artikel baru untuk Bluesky.")

if __name__ == "__main__":
    main()
