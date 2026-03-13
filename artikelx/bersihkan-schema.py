import os
import re

# ======================================================
# KONFIGURASI PEMBERSIH (STRICT LOCAL)
# ======================================================
# "./" berarti hanya memproses folder tempat script dijalankan
TARGET_FOLDER = "./" 

SCHEMA_REGEX = re.compile(
    r'<script\s+type="application/ld\+json">.*?</script>',
    re.DOTALL | re.IGNORECASE
)

# Extension yang akan diproses
EXTENSIONS = (".html", ".htm")

def clean_schema_in_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Cek apakah ada skema
        if re.search(SCHEMA_REGEX, content):
            # Proses pembersihan
            cleaned_content = re.sub(SCHEMA_REGEX, "", content)
            
            # Tulis ulang file
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(cleaned_content)
            return True
        return False
    except Exception as e:
        print(f"❌ Error pada {file_path}: {e}")
        return False

def run_cleaner_local():
    # Mengambil path absolut tempat script berada
    current_path = os.path.abspath(TARGET_FOLDER)
    print(f"🧹 Memulai pembersihan STRICT LOCAL di: {current_path}")
    print("⚠️  Script ini tidak akan memeriksa sub-folder (Non-Recursive).")
    print("-" * 50)
    
    count_cleaned = 0
    count_total = 0

    # os.listdir hanya mengambil isi folder saat ini, tidak masuk ke dalam
    for item in os.listdir(TARGET_FOLDER):
        item_path = os.path.join(TARGET_FOLDER, item)
        
        # Pastikan ini adalah file (bukan folder) dan berakhiran .html
        if os.path.isfile(item_path) and item.lower().endswith(EXTENSIONS):
            count_total += 1
            if clean_schema_in_file(item_path):
                print(f"✅ Cleaned: {item}")
                count_cleaned += 1

    print("-" * 50)
    print(f"📊 HASIL PEMBERSIHAN (LOCAL ONLY)")
    print(f"📂 Total file HTML ditemukan : {count_total}")
    print(f"✨ File yang dibersihkan      : {count_cleaned}")
    print(f"😴 File sudah bersih          : {count_total - count_cleaned}")
    print("-" * 50)

if __name__ == "__main__":
    run_cleaner_local()
