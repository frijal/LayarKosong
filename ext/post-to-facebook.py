import json
import urllib.parse
import os
import sys

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/facebook-posted.txt'
BASE_URL = 'https://dalam.web.id/artikel/'

def main():
    if not os.path.exists(JSON_FILE):
        print("Error: artikel.json tidak ditemukan")
        sys.exit(1)

    # Load data
    with open(JSON_FILE, 'r') as f:
        data = json.load(f)

    # Gabungkan semua kategori dan selipkan nama kategori
    all_posts = []
    for category_name, posts in data.items():
        for post in posts:
            # post[1] adalah slug file (misal: sembelit.html)
            post_with_cat = post + [category_name]
            all_posts.append(post_with_cat)

    # Reverse agar artikel paling jadul (indeks terakhir di JSON) jadi yang pertama
    all_posts.reverse()

    # Load database URL yang sudah pernah diposting
    posted_urls = []
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            posted_urls = [line.strip() for line in f.readlines()]

    # Cari yang belum diposting
    target_post = None
    target_url = None
    for post in all_posts:
        # Gunakan BASE_URL yang baru
        url = f"{BASE_URL}{post[1]}"
        if url not in posted_urls:
            target_post = post
            target_url = url
            break

    if target_post:
        title = target_post[0]
        desc = target_post[4]
        cat_raw = target_post[5]

        # Format hashtag kategori: #namakategori
        cat_hashtag = "#" + cat_raw.replace(" ", "").lower()

        # Gabungan 4 hashtag wajib
        hashtags = f"#repost #ngopi {cat_hashtag} #indonesia"

        full_msg = f"📝 {title}\n\n{desc}\n\n{target_url}\n\n{hashtags}"
        encoded_msg = urllib.parse.quote(full_msg)

        # Output untuk GitHub Actions
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as go:
                go.write(f"url={target_url}\n")
                go.write(f"encoded_msg={encoded_msg}\n")

        # Simpan URL sementara untuk diproses Git commit di workflow
        with open('temp_new_url.txt', 'w') as f:
            f.write(target_url + '\n')

        print(f"Berhasil memproses artikel jadul: {target_url}")
    else:
        print("Misi selesai! Semua artikel sudah terposting.")

if __name__ == "__main__":
    main()
