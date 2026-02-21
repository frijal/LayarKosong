import os
import re
import shutil

# Konfigurasi Folder Target
TARGET_DIR = 'artikel/'

SCRIPTS_TO_REMOVE = [
    r'<script defer="" src="/ext/marquee-url.js"></script>',
    r'<script defer="" src="/ext/iposbrowser.js"></script>',
    r'<script defer="" src="/ext/markdown.js"></script>',
    r'<script defer="" src="/ext/pesbukdiskus.js"></script>',
    r'<script defer src="/ext/marquee-url.js"></script>',
    r'<script defer src="/ext/iposbrowser.js"></script>',
    r'<script defer src="/ext/markdown.js"></script>',
    r'<script defer src="/ext/pesbukdiskus.js"></script>'
]

NEW_BLOCK = (
    '<script defer="" src="/ext/markdown.js"></script>'
    '<script defer="" src="/ext/marquee-url.js"></script>'
    '<script defer="" src="/ext/iposbrowser.js"></script>'
    '<script defer="" src="/ext/pesbukdiskus.js"></script>'
)

def clean_and_replace():
    count = 0
    if not os.path.exists(TARGET_DIR):
        print(f"❌ Folder '{TARGET_DIR}' tidak ditemukan!")
        return

    for root, dirs, files in os.walk(TARGET_DIR):
        for file in files:
            # Pastikan hanya memproses .html dan bukan file .html-bak yang sudah ada
            if file.endswith(".html"):
                path_file = os.path.join(root, file)
                
                with open(path_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                original_content = content
                
                # 1. Hapus skrip lama satu per satu
                for s in SCRIPTS_TO_REMOVE:
                    content = content.replace(s, "")

                # 2. Bersihkan baris kosong
                content = re.sub(r'^\s*$\n', '', content, flags=re.MULTILINE)

                # 3. Sisipkan blok baru tepat sebelum </body>
                if NEW_BLOCK not in content:
                    if "</body>" in content:
                        content = content.replace("</body>", f"{NEW_BLOCK}\n</body>")
                    else:
                        content += f"\n{NEW_BLOCK}"

                # Simpan jika ada perubahan
                if content != original_content:
                    # PROSES BACKUP: Copy file ke namafile.html-bak
                    backup_path = path_file + "-bak"
                    shutil.copy2(path_file, backup_path)
                    
                    with open(path_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"✅ Diperbaiki & Backup dibuat: {file}-bak")
                    count += 1

    print(f"\nSelesai! {count} file di folder '{TARGET_DIR}' telah diperbarui.")

if __name__ == "__main__":
    clean_and_replace()
