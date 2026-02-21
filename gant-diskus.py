import os
import shutil

def replace_text_in_html(root_dir, old_text="pesbukdiskus", new_text="diskus"):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".html"):
                file_path = os.path.join(dirpath, filename)
                backup_path = file_path + "-bak"

                # Buat backup file
                shutil.copy2(file_path, backup_path)

                # Baca isi file
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                # Ganti teks
                updated_content = content.replace(old_text, new_text)

                # Tulis kembali ke file asli
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(updated_content)

                print(f"Processed: {file_path} (backup: {backup_path})")

if __name__ == "__main__":
    # Ganti '.' dengan direktori target
    replace_text_in_html(".")
