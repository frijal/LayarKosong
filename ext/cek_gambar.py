import os
import re

def scan_unused_images():
    html_folder = './artikel/'
    img_folder = './img/'
    output_file = './img/gambarnganggur.txt'

    if not os.path.exists(img_folder):
        return
    all_images = {f for f in os.listdir(img_folder) if f.lower().endswith('.webp')}

    used_images = set()
    if not os.path.exists(html_folder):
        return

    # REGEX BARU: Mencari nama file sebelum .webp
    # Pola ini mencari karakter yang bukan / atau kutip atau spasi, yang diakhiri .webp
    # Contoh: /img/kucing.webp -> akan ambil 'kucing.webp'
    # Contoh: src="ayam.webp" -> akan ambil 'ayam.webp'
    webp_pattern = re.compile(r'([^/\\"\']+\.webp)', re.IGNORECASE)

    for root, dirs, files in os.walk(html_folder):
        for file in files:
            if file.lower().endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Kita cari semua yang cocok dengan pola .webp
                        matches = webp_pattern.findall(content)
                        for match in matches:
                            # Kita ambil hanya nama filenya saja (basename)
                            # Antisipasi kalau ada path lengkap yang tertangkap
                            clean_name = os.path.basename(match)
                            used_images.add(clean_name)
                except Exception as e:
                    print(f"⚠️ Gagal: {e}")

    unused_images = all_images - used_images

    if unused_images:
        with open(output_file, 'a', encoding='utf-8') as out:
            for img in sorted(unused_images):
                out.write(img + '\n')
        print(f"✅ Ditemukan {len(unused_images)} gambar nganggur (Regex longgar).")
    else:
        print("😎 Aman! Semua file .webp terdeteksi dalam kode HTML.")

if __name__ == "__main__":
    scan_unused_images()
