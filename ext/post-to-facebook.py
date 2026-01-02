import json
import urllib.parse
import os
import sys

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-facebook.txt'
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
            # Kita bersihkan .html jika ada, agar konsisten dengan LinkedIn
            slug = post[1].replace('.html', '')
            post_with_cat = [post[0], slug, post[2], post[3], post[4], category_name]
            all_posts.append(post_with_cat)

    # Reverse agar artikel paling jadul jadi yang pertama
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
        url = f"{BASE_URL}{post[1]}"
        if url not in posted_urls:
            target_post = post
            target_url = url
            break

    if target_post:
        # title = target_post[0] # Judul tidak digunakan dalam pesan
        desc = target_post[4]
        cat_raw = target_post[5]

        # Format hashtag kategori: #namakategori
        cat_hashtag = "#" + cat_raw.replace(" ", "").lower()

        # Gabungan hashtag wajib
        hashtags = f"#LayarKosong #Repost #Ngopi {cat_hashtag} #Indonesia"

        # URUTAN BARU: Deskripsi -> Hashtag -> Link (Tanpa Judul)
        full_msg = f"{desc}\n\n{hashtags}\n\n{target_url}"

        encoded_msg = urllib.parse.quote(full_msg)

        # Output untuk GitHub Actions
        if 'GITHUB_OUTPUT' in os.environ:
            with open(os.environ['GITHUB_OUTPUT'], 'a') as go:
                go.write(f"url={target_url}\n")
                go.write(f"encoded_msg={encoded_msg}\n")

        # Simpan URL sementara untuk diproses Git commit di workflow
        with open('temp_new_url.txt', 'w') as f:
            f.write(target_url + '\n')

        print(f"Berhasil memproses artikel untuk FB: {target_url}")
    else:
        print("Misi selesai! Semua artikel sudah terposting di Facebook.")

if __name__ == "__main__":
    main()
