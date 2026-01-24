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
# Trimming dan ubah spasi jadi tanda hubung (sinkron dengan script lain)
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

    # --- LOAD DATABASE (Cek sebagai string besar untuk filter Slug) ---
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

                # Format URL V6.9: https://dalam.web.id/kategori/slug/
                full_url = f"{DOMAIN_URL}/{cat_slug}/{file_slug}/"

                # CEK BERDASARKAN SLUG (Anti-Spam artikel lama)
                if file_slug not in posted_database:
                    all_posts.append({
                        'title': post[0],
                        'slug': file_slug,
                        'url': full_url,
                        'date': post[3],
                        'desc': post[4] or "Archive.",
                        'category': category_name
                    })

                    # --- SORTING AKURAT (Terbaru -> Lama) ---
                    all_posts.sort(key=lambda x: x['date'], reverse=True)

                    # Ambil yang paling gres
                    if all_posts:
                        target_post = all_posts[0]
                        target_url = target_post['url']

                        desc = target_post['desc']
                        cat_raw = target_post['category']

                        # Format hashtag kategori: #namakategori
                        cat_hashtag = "#" + cat_raw.replace(" ", "").lower()
                        hashtags = f"#fediverse #Repost #Ngopi {cat_hashtag} #Indonesia"

                        # URUTAN: Deskripsi -> Hashtag -> Link
                        full_msg = f"{target_post['title']}\n\n{desc}\n\n{hashtags}\n\n{target_url}"
                        encoded_msg = urllib.parse.quote(full_msg)

                        # Output untuk GitHub Actions
                        if 'GITHUB_OUTPUT' in os.environ:
                            with open(os.environ['GITHUB_OUTPUT'], 'a') as go:
                            go.write(f"url={target_url}\n")
                            go.write(f"encoded_msg={encoded_msg}\n")

                            # Simpan URL sementara untuk diproses Git commit di workflow
                            # Kita pakai target_url lengkap agar database txt tetap rapi
                            with open('/tmp/temp_new_url_facebook.txt', 'w') as f:
                            f.write(target_url + '\n')

                            print(f"✅ Berhasil memproses artikel TERBARU ({target_post['date']}): {target_url}")
                            else:
                                print("✅ Misi selesai! Tidak ada artikel baru (berdasarkan cek slug) untuk Facebook.")

                                if __name__ == "__main__":
                                    main()
