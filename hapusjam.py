import os
import re

# --- KONFIGURASI ---
# Ganti dengan path folder blog Layar Kosong kamu jika tidak dijalankan di folder yang sama
TARGET_DIRECTORY = "." 

# Pola Regex: 
# Mencari teks di dalam <noscript>..._YYYY-MM-DD_HH_mm</noscript>
# Dan menangkap bagian (_HH_mm) di akhir untuk dihapus
# Pattern ini mencari: <noscript> + teks apapun + _YYYY-MM-DD + (_jam_menit) + </noscript>
PATTERN = r'(<noscript>.*?_\d{4}-\d{2}-\d{2})(_\d{2}_\d{2})(</noscript>)'

def clean_html_files():
    count = 0
    print(f"🔍 Memulai pemindaian file .html di: {os.path.abspath(TARGET_DIRECTORY)}")

    for root, dirs, files in os.walk(TARGET_DIRECTORY):
        for file in files:
            if file.endswith(".html"):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Melakukan penggantian: mengambil grup 1 (<noscript>..._tgl) dan grup 3 (</noscript>)
                # Serta membuang grup 2 (_jam_menit)
                new_content, subs_made = re.subn(PATTERN, r'\1\3', content)

                if subs_made > 0:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"✅ Berhasil merapikan: {file} ({subs_made} perubahan)")
                    count += 1

    print(f"\n✨ Selesai! Total {count} file telah dibersihkan.")

if __name__ == "__main__":
    # Konfirmasi sebelum jalan (opsional)
    confirm = input("Script ini akan memodifikasi file .html secara permanen. Lanjut? (y/n): ")
    if confirm.lower() == 'y':
        clean_html_files()
    else:
        print("Dibatalkan.")

