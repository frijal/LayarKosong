import json
import os
import sys
import re
import requests

# Konfigurasi Path & URL
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-patreon.txt'
DOMAIN_URL = 'https://dalam.web.id'

# Patreon Config
PATREON_ACCESS_TOKEN = os.getenv('PATREON_ACCESS_TOKEN')

def slugify(text):
    text = text.strip().lower()
    text = re.sub(r'\s+', '-', text)
    return text

def get_actual_campaign_id(token):
    """Mendapatkan ID Campaign yang valid langsung dari API"""
    url = "https://www.patreon.com/api/oauth2/v2/campaigns"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            if data.get('data'):
                return data['data'][0]['id']
        print(f"⚠️ Respon API Campaign ({res.status_code}): {res.text}")
    except Exception as e:
        print(f"⚠️ Gagal mendeteksi Campaign ID: {e}")
    return None

def main():
    if not os.path.exists(JSON_FILE):
        print("Error: artikel.json tidak ditemukan")
        sys.exit(1)

    # 1. Validasi Token
    token = str(PATREON_ACCESS_TOKEN).strip() if PATREON_ACCESS_TOKEN else None
    if not token:
        print("⚠️ Error: PATREON_ACCESS_TOKEN tidak ditemukan!")
        return

    # 2. Auto-Detect Campaign ID
    camp_id = get_actual_campaign_id(token)
    if not camp_id:
        print("❌ Gagal mendapatkan Campaign ID. Pastikan Token benar dan Page sudah Launch.")
        return
    print(f"📍 Menggunakan Campaign ID: {camp_id}")

    # 3. Load Data
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    posted_database = ""
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            posted_database = f.read()

    all_posts = []
    for category_name, posts in data.items():
        cat_slug = slugify(category_name)
        for post in posts:
            # post[1] adalah slug file
            file_slug = post[1].strip().replace('.html', '').replace('/', '')
            full_url = f"{DOMAIN_URL}/{cat_slug}/{file_slug}/"

            if file_slug not in posted_database:
                all_posts.append({
                    'title': post[0],
                    'slug': file_slug,
                    'url': full_url,
                    'date': post[3],
                    'desc': post[4] or "Kupas Tuntas di Layar Kosong."
                })

    # Urutkan artikel terbaru
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    if all_posts:
        target_post = all_posts[0]
        title = target_post['title']
        body = f"<p>{target_post['desc']}</p><p>Kupas Tuntas di: <a href='{target_post['url']}'>{target_post['url']}</a></p>"

        # --- PREPARE PAYLOAD ---
        payload = {
            "data": {
                "type": "post",
                "attributes": {
                    "title": title,
                    "content": body,
                    "is_public": True,
                    "publish_state": "published"
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

        # --- EXECUTE WITH FALLBACK ---
        api_url = "https://www.patreon.com/api/oauth2/v2/posts"

        print(f"🚀 Mengirim '{title}' ke Patreon...")
        try:
            # Percobaan 1: Tanpa Slash
            response = requests.post(api_url, json=payload, headers=headers)

            # Percobaan 2: Dengan Slash jika 404
            if response.status_code == 404:
                print("🔄 Rute standar 404, mencoba dengan trailing slash...")
                response = requests.post(api_url + "/", json=payload, headers=headers)

            if response.status_code in [200, 201]:
                print(f"✅ BERHASIL! Artikel tayang di Patreon.")
                with open(DATABASE_FILE, 'a', encoding='utf-8') as f:
                    f.write(target_post['slug'] + '\n')
            else:
                print(f"❌ Gagal. Status: {response.status_code}")
                print(f"Pesan Server: {response.text}")

        except Exception as e:
            print(f"❌ Request error: {e}")
    else:
        print("✅ Tidak ada artikel baru untuk diposting.")

if __name__ == "__main__":
    main()
