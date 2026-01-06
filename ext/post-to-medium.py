import json
import os
import requests
import sys

# Konfigurasi
JSON_FILE = 'artikel.json'
DATABASE_FILE = 'mini/posted-medium.txt'
BASE_URL = 'https://dalam.web.id/artikel/'

def main():
    token = os.getenv('MEDIUM_TOKEN')
    user_id = os.getenv('MEDIUM_USER_ID') # Dapatkan lewat API /me

    if not token or not user_id:
        print("❌ Token atau User ID Medium belum di-set!")
        sys.exit(1)

    # Load & Sort data (Gunakan logika yang sama dengan skrip Facebook kamu)
    with open(JSON_FILE, 'r') as f:
        data = json.load(f)
    
    all_posts = []
    for category_name, posts in data.items():
        for post in posts:
            slug = post[1].replace('.html', '')
            all_posts.append({
                'title': post[0],
                'slug': slug,
                'image': post[2],
                'date': post[3],
                'desc': post[4],
                'category': category_name
            })
    
    all_posts.sort(key=lambda x: x['date'], reverse=True)

    # Database check
    posted_urls = []
    if os.path.exists(DATABASE_FILE):
        with open(DATABASE_FILE, 'r') as f:
            posted_urls = [line.strip() for line in f.readlines()]

    target_post = None
    for post in all_posts:
        url = f"{BASE_URL}{post['slug']}"
        if url not in posted_urls:
            target_post = post
            target_url = url
            break

    if target_post:
        # Menyiapkan konten untuk Medium (Format Markdown)
        content = f"""
![Header Image]({target_post['image']})

{target_post['desc']}

---
*Artikel ini pertama kali tayang di [Layar Kosong]({target_url})*

#LayarKosong #Blog #Indonesia #{target_post['category'].replace(" ", "")}
        """

        url_api = f"https://api.medium.com/v1/users/{user_id}/posts"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        payload = {
            "title": target_post['title'],
            "contentFormat": "markdown",
            "content": content,
            "canonicalUrl": target_url, # PENTING: Biar Google gak anggap konten duplikat
            "publishStatus": "public" # Bisa diganti "draft" dulu kalau mau dicek manual
        }

        response = requests.post(url_api, headers=headers, json=payload)

        if response.status_code == 201:
            with open('temp_new_url_medium.txt', 'w') as f:
                f.write(target_url + '\n')
            print(f"✅ Sukses publish ke Medium: {target_post['title']}")
        else:
            print(f"❌ Gagal ke Medium: {response.text}")
    else:
        print("✅ Tidak ada artikel baru untuk Medium.")

if __name__ == "__main__":
    main()
