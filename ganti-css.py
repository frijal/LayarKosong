import os
import re

# Folder yang dipindai
folders = ['./warta-tekno', './gaya-hidup', './jejak-sejarah', './lainnya', './olah-media', './opini-sosial', './sistem-terbuka']

# Dictionary pemetaan pola URL ke path lokal
replacements = {
    r'https://.*/prism-vsc-dark-plus\.min\.css': '/ext/vs-dark.min.css',
    r'https://.*/prism-tomorrow\.min\.css': '/ext/prism-tomorrow.min.css',
    r'https://.*/prism\.min\.css': '/ext/default.min.css',
    r'https://.*/prism\.css': '/ext/default.min.css',
    r'https://.*/prism-okaidia\.min\.css': '/ext/monokai.min.css',
    r'https://.*/prism-one-dark\.min\.css': '/ext/atom-one-dark.min.css',
    r'https://.*/prism-one-light\.min\.css': '/ext/atom-one-light.min.css',
    r'https://.*/prism-twilight\.min\.css': '/ext/vs-dark.min.css',
    r'https://.*/prism-coy\.min\.css': '/ext/default.min.css',
    r'https://.*/all(\.min)?\.css': '/ext/fontawesome.css',
    r'https://.*/leaflet\.css': '/ext/leaflet.css',
    r'https://.*/prism-toolbar(\.min)?\.css': '/ext/prism-toolbar.min.css',
}

for folder in folders:
    if not os.path.exists(folder): continue
    for root, dirs, files in os.walk(folder):
        for file in files:
            # 🛡️ PENGAMAN: Lewati jika nama filenya index.html
            if file.lower() == "index.html":
                continue

            if file.endswith(".html"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content
                for pattern, local_path in replacements.items():
                    # Menangani format tanpa kutip: href=URL
                    regex_pattern = f'href=["\']?{pattern}["\']?'
                    new_content = re.sub(regex_pattern, f'href={local_path}', new_content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"✅ Berhasil: {path}")

print("\n🔥 Operasi selesai! Folder index.html tetap aman dari jamahan script.")