import os
import re

# Daftar folder yang akan dipindai
folders = ['./gaya-hidup', './jejak-sejarah', './lainnya', './olah-media', './opini-sosial', './sistem-terbuka', './warta-tekno']

pattern = r'<link\s+[^>]*href=["\']?(/ext/[^"\s>]+)["\']?[^>]*rel=["\']?stylesheet["\']?[^>]*>|<link\s+[^>]*rel=["\']?stylesheet["\']?[^>]*href=["\']?(/ext/[^"\s>]+)["\']?[^>]*>'

def clean_tag(match):
    # Ambil path file (grup 1 atau grup 2 tergantung urutan href/rel)
    path = match.group(1) or match.group(2)
    return f'<link href={path} rel=stylesheet>'

for folder in folders:
    if not os.path.exists(folder): continue
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Eksekusi penggantian ke format tanpa kutip
                new_content = re.sub(pattern, clean_tag, content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"🧹 Formatted: {file}")

print("\n✨ Done! Semua tag CSS sekarang menggunakan format minimalis.")
