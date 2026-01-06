import os
import re

def scan_unused_images():
    html_folder = './artikel/'
    img_folder = './img/'
    output_file = './img/gambarnganggur.txt'
    
    # 1. Ambil daftar semua file .webp di folder img/
    if not os.path.exists(img_folder):
        print(f"❌ Error: Folder {img_folder} tidak ditemukan!")
        return

    all_images = {f for f in os.listdir(img_folder) if f.lower().endswith('.webp')}
    
    # 2. Cari referensi gambar di semua file .html dalam folder artikel/
    used_images = set()
    
    if not os.path.exists(html_folder):
        print(f"❌ Error: Folder {html_folder} tidak ditemukan!")
        return

    # Regex untuk mencari nama file gambar .webp (mengambil nama filenya saja)
    # Mencari pola seperti: /img/foto.webp atau src="foto.webp"
    webp_pattern = re.compile(r'([^/\\"\']+\.webp)', re.IGNORECASE)

    for root, dirs, files in os.walk(html_folder):
        for file in files:
            if file.lower().endswith('.html'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = webp_pattern.findall(content)
                        for match in matches:
                            used_images.add(match)
                except Exception as e:
                    print(f"⚠️ Gagal membaca {file}: {e}")

    # 3. Cari yang tidak terpakai (Selisih antara all_images dan used_images)
    unused_images = all_images - used_images

    # 4. Simpan hasilnya
    with open(output_file, 'w', encoding='utf-8') as out:
        if unused_images:
            for img in sorted(unused_images):
                out.write(img + '\n')
            print(f"✅ Selesai! {len(unused_images)} gambar tak terpakai dicatat di {output_file}")
        else:
            out.write("Semua gambar terpakai dengan baik.")
            print("😎 Mantap! Semua gambar di folder img/ terpakai di HTML.")

if __name__ == "__main__":
    scan_unused_images()
