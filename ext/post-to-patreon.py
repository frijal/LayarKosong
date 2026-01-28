import json
import os
import sys
import re
import requests

# Konfigurasi Path & API
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-patreon.txt'
DOMAIN_URL = 'https://dalam.web.id'

# Patreon Config (Sebaiknya simpan di GitHub Secrets)
PATREON_ACCESS_TOKEN = os.getenv('PATREON_ACCESS_TOKEN')
CAMPAIGN_ID = os.getenv('PATREON_CAMPAIGN_ID') # ID Campaign Patreon kamu

def slugify(text):
    text = text.strip().lower()
    text = re.sub(r'\s+', '-', text)
    return text

def main():
    if not os.path.exists(JSON_FILE):
        print("Error: artikel.json tidak ditemukan")
        sys.exit(1)

    # Load data artikel
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Load database biar nggak posting ulang (Anti-Double Post)
    posted_database = ""
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            posted_database = f.read()

    all_posts = []
    for category_name, posts in data.items():
        cat_slug = slugify(category_name)
        for post in posts:
            file_name = post[1].strip()
            file_slug = file_name.replace('.html', '').replace('/', '')
            full_url = f"{DOMAIN_URL}/{cat_slug}/{file_slug}/"

            if file_slug not in posted_database:
                all_posts.append({
                    'title': post[0],
                    'slug': file_slug,
                    'url': full_url,
                    'date': post[3],
                    'desc': post[4] or "Baca selengkapnya di Layar Kosong.",
                    'category': category_name
                })

    # Urutkan dari yang terbaru
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    if all_posts:
        target_post = all_posts[0]
        
# --- PERSIAPAN KONTEN PATREON ---
        title = target_post['title']
        body = f"<p>{target_post['desc']}</p><p>Baca selengkapnya di: <a href='{target_post['url']}'>{target_post['url']}</a></p>"

# --- PERBAIKAN PAYLOAD ---
        payload = {
            "data": {
                "type": "post",
                "attributes": {
                    "title": target_post['title'],
                    "content": body,
                    "is_paid": False,
                    "publish_state": "published" # Perbaikan: publish_state (tunggal)
                },
                "relationships": {
                    "campaign": {
                        "data": {
                            "type": "campaign",
                            "id": str(CAMPAIGN_ID).strip() # Pastikan bersih dari spasi
                        }
                    }
                }
            }
        }

        # Gunakan Header Accept juga agar lebih 'sopan' ke server Patreon
        headers = {
            "Authorization": f"Bearer {PATREON_ACCESS_TOKEN}",
            "Content-Type": "application/vnd.api+json",
            "Accept": "application/vnd.api+json"
        }

        # Eksekusi ke API Patreon
        if PATREON_ACCESS_TOKEN:
            headers = {
                "Authorization": f"Bearer {PATREON_ACCESS_TOKEN}",
                "Content-Type": "application/vnd.api+json" # Header wajib JSON:API
            }

            # URL yang benar untuk POST v2 (TANPA trailing slash di akhir)
            api_url = "https://www.patreon.com/api/oauth2/v2/posts"

            response = requests.post(api_url, json=payload, headers=headers)

            if response.status_code in [201, 200]:
                print(f"✅ Berhasil posting ke Patreon: {title}")
                with open(DATABASE_FILE, 'a', encoding='utf-8') as f:
                    f.write(target_post['slug'] + '\n')
            else:
                print(f"❌ Gagal posting. Status: {response.status_code}")
                print(f"Detail: {response.text}")
        else:
            print("⚠️ Token Patreon tidak ditemukan di environment variable.")
            
    else:
        print("✅ Tidak ada artikel baru untuk Patreon.")

if __name__ == "__main__":
    main()
