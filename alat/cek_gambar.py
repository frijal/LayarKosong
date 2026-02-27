import os
import re

def scan_unused_images():
    # 👉 PERBAIKAN: Jangan cuma scan 'artikel/', tapi scan root '.'
    # Kita akan memfilter folder mana saja yang mau di-scan di dalam loop
    root_folder = './'
    img_folder = './img/'
    output_file = './img/gambarnganggur.txt'

    if not os.path.exists(img_folder):
        return

    # Ambil semua gambar fisik yang ada di folder img
    all_images = {f for f in os.listdir(img_folder) if f.lower().endswith('.webp')}

    used_images = set()

    # REGEX: Mencari nama file .webp di dalam kode HTML
    webp_pattern = re.compile(r'([^/\\"\']+\.webp)', re.IGNORECASE)

    # Folder yang boleh di-scan (Kategori Mas + folder artikel lama)
    # Kita skip folder sistem agar scan lebih cepat
    skip_folders = {'node_modules', '.git', 'img', 'sementara', 'artikelx', 'mini', 'ext', '.github'}

    for root, dirs, files in os.walk(root_folder):
        # Filter agar tidak masuk ke folder sistem
        dirs[:] = [d for d in dirs if d not in skip_folders]

        for file in files:
            # Hanya scan file HTML
            if file.lower().endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = webp_pattern.findall(content)
                        for match in matches:
                            clean_name = os.path.basename(match)
                            used_images.add(clean_name)
                except Exception as e:
                    print(f"⚠️ Gagal membaca {file_path}: {e}")

    # Logika Matematika Himpunan: (Semua Gambar) - (Gambar yang ditemukan di HTML)
    unused_images = all_images - used_images

    # Pastikan file output bersih dulu sebelum ditulis (overwrite/clean start)
    # Kita pakai 'w' bukan 'a' supaya tidak tumpuk-tumpuk data lama
    if unused_images:
        with open(output_file, 'w', encoding='utf-8') as out:
            for img in sorted(unused_images):
                out.write(img + '\n')
        print(f"✅ V6.9 Scan: Ditemukan {len(unused_images)} gambar nganggur.")
    else:
        # Jika semua terpakai, kosongkan file agar workflow tidak menghapus apapun
        open(output_file, 'w').close()
        print("😎 Aman! Semua file .webp terdeteksi di seluruh folder kategori.")

if __name__ == "__main__":
    scan_unused_images()
