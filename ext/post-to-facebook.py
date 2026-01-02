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

    # Gabungkan semua kategori
    all_posts = []
    for category_name, posts in data.items():
        for post in posts:
            # Struktur: [0:judul, 1:slug, 2:image, 3:date(ISO), 4:desc]
            slug = post[1].replace('.html', '')
            iso_date = post[3] # Mengambil string ISO 8601 lengkap
            
            # Kita susun ulang untuk diproses
            post_with_cat = {
                'title': post[0],
                'slug': slug,
                'date': iso_date,
                'desc': post[4],
                'category': category_name
            }
            all_posts.append(post_with_cat)

    # --- LOGIKA SORTING AKURAT ---
    # Mengurutkan berdasarkan string tanggal ISO secara terbalik (Terbaru -> Lama)
    # Karena format ISO 8601 (YYYY-MM-DDTHH:MM...) bisa di-sort langsung secara alfabetis
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    # Load database URL yang sudah pernah diposting
    posted_urls = []
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            posted_urls = [line.strip() for line in f.readlines()]

    # Cari yang belum diposting (loop ini akan menemukan yang paling gres duluan)
    target_post = None
    target_url = None
    for post in all_posts:
        url = f"{BASE_URL}{post['slug']}"
        if url not in posted_urls:
            target_post = post
            target_url = url
            break

    if target_post:
        desc = target_post['desc']
        cat_raw = target_post['category']

        # Format hashtag kategori: #namakategori
        cat_hashtag = "#" + cat_raw.replace(" ", "").lower()

        # Gabungan hashtag wajib (Warna khas Layar Kosong #00b0ed disisipkan secara implisit di brand)
        hashtags = f"#fediverse #Repost #Ngopi {cat_hashtag} #Indonesia"

        # URUTAN: Deskripsi -> Hashtag -> Link
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

        print(f"✅ Berhasil memproses artikel TERBARU ({target_post['date']}): {target_url}")
    else:
        print("✅ Misi selesai! Tidak ada artikel baru untuk diposting ke Facebook.")

if __name__ == "__main__":
    main()
