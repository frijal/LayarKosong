import os
import re

# Daftar folder yang akan dipindai
folders = ['./artikel', './gaya-hidup', './jejak-sejarah', './lainnya', './olah-media', './opini-sosial', './sistem-terbuka', './warta-tekno']

# Dictionary pemetaan pola URL ke path lokal
# Menggunakan regex untuk menangkap berbagai versi CDN (cdnjs, jsdelivr, unpkg)
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
    r'https://.*/atom-one-dark\.min\.css': '/ext/atom-one-dark.min.css',
    r'https://.*/atom-one-light\.min\.css': '/ext/atom-one-light.min.css',
    r'https://.*/monokai\.min\.css': '/ext/monokai.min.css',
    r'https://.*/github-dark-dimmed\.min\.css': '/ext/github-dark-dimmed.min.css',
    r'https://.*/vs\.min\.css': '/ext/vs.min.css',
    r'https://.*/vs-dark\.min\.css': '/ext/vs-dark.min.css',
    r'https://.*/all(\.min)?\.css': '/ext/fontawesome.css',
    r'https://.*/basicLightbox\.min\.css': '/ext/basicLightbox.min.css',
    r'https://.*/lightbox\.min\.css': '/ext/lightbox.min.css',
    r'https://.*/prism-toolbar(\.min)?\.css': '/ext/prism-toolbar.min.css',
}

for folder in folders:
    if not os.path.exists(folder): continue
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content
                for pattern, local_path in replacements.items():
                    new_content = re.sub(pattern, local_path, new_content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"✅ Lokalisasi sukses: {file}")

print("\n🔥 Operasi selesai! Semua link CDN telah diarahkan ke /ext/")
