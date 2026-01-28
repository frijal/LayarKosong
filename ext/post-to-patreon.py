import json
import os
import sys
import re
import requests

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-patreon.txt'
DOMAIN_URL = 'https://dalam.web.id'

# Patreon Config (Ambil dari GitHub Secrets)
PATREON_ACCESS_TOKEN = os.getenv('PATREON_ACCESS_TOKEN')
CAMPAIGN_ID = os.getenv('PATREON_CAMPAIGN_ID')

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

    # Load database biar nggak posting ulang
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
                    'desc': post[4] or "Kupas Tuntas di Layar Kosong.",
                    'category': category_name
                })

    # Urutkan dari yang terbaru
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    if all_posts:
        target_post = all_posts[0]
        title = target_post['title']
        body = f"<p>{target_post['desc']}</p><p>Kupas Tuntas di: <a href='{target_post['url']}'>{target_post['url']}</a></p>"

        # Token & ID Cleaning
        token = str(PATREON_ACCESS_TOKEN).strip() if PATREON_ACCESS_TOKEN else None
        camp_id = str(CAMPAIGN_ID).strip() if CAMPAIGN_ID else None

        if not token or not camp_id:
            print("⚠️ Error: PATREON_ACCESS_TOKEN atau PATREON_CAMPAIGN_ID tidak ditemukan!")
            return

        # --- PREPARE PAYLOAD ---
        payload = {
            "data": {
                "type": "post",
                "attributes": {
                    "title": title,
                    "content": body,
                    "is_paid": False,
                    "is_public": True
                },
                "relationships": {
                    "campaign": {
                        "data": {
                            "type": "campaign",
                            "id": camp_id
                        }
                    }
                }
            }
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.api+json",
            "Accept": "application/vnd.api+json"
        }

        # --- TRY POSTING ---
        print(f"🚀 Mencoba rute kampanye untuk: {title}...")
        api_url = f"https://www.patreon.com/api/oauth2/v2/campaigns/{camp_id}/posts"

        try:
            response = requests.post(api_url, json=payload, headers=headers)

            # Jika rute kampanye ditolak (405/404), coba rute umum
            if response.status_code in [404, 405]:
                print("⚠️ Rute kampanye ditolak, mencoba rute /v2/posts...")
                api_url = "https://www.patreon.com/api/oauth2/v2/posts"
                response = requests.post(api_url, json=payload, headers=headers)

            if response.status_code in [200, 201]:
                print(f"✅ Berhasil posting ke Patreon: {title}")
                with open(DATABASE_FILE, 'a', encoding='utf-8') as f:
                    f.write(target_post['slug'] + '\n')
            else:
                print(f"❌ Gagal total. Status: {response.status_code}")
                print(f"Detail: {response.text}")

        except Exception as e:
            print(f"❌ Terjadi kesalahan saat request: {str(e)}")

    else:
        print("✅ Tidak ada artikel baru untuk diposting.")

if __name__ == "__main__":
    main()
