import sys
import os

def overwrite_clean_file(target_file):
    # 1. Validasi keberadaan file
    if not os.path.exists(target_file):
        print(f"❌ Error: File '{target_file}' tidak ada di folder ini!")
        return

    try:
        # 2. Baca isi file ke dalam memori
        with open(target_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 3. Bersihkan setiap baris
        # Menghapus spasi/newline dulu, baru rstrip '/'
        cleaned_lines = [line.strip().rstrip('/') for line in lines if line.strip()]

        # 4. Tulis balik ke file yang sama (Menimpa)
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(cleaned_lines) + '\n')

        print(f"🚀 Done! File '{target_file}' sudah bersih dari trailing slash.")
        print(f"📝 {len(cleaned_lines)} baris telah diperbarui.")

    except Exception as e:
        print(f"❌ Waduh, ada error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("⚠️  Cara pakai: python3 cleaner.py <nama-file.txt>")
    else:
        nama_input = sys.argv[1]
        
        # Konfirmasi kecil biar nggak nyesal
        pilihan = input(f"Yakin mau hapus '/' di file '{nama_input}'? (y/n): ")
        if pilihan.lower() == 'y':
            overwrite_clean_file(nama_input)
        else:
            print("🚫 Operasi dibatalkan.")
