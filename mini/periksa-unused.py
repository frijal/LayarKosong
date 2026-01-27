import os
import subprocess
import json
from datetime import datetime

# --- KONFIGURASI ---
TARGET_DIR = "ext"
REPORT_FILE = "mini/unused-package.txt"
CLEANUP_SCRIPT = "mini/auto_cleanup.sh"

def run_grep(pattern, exclude_dirs, include_ext=None):
    """Fungsi pembantu untuk menjalankan grep tanpa bikin script mati"""
    cmd = ["grep", "-r", pattern, "."]
    for d in exclude_dirs:
        cmd.extend(["--exclude-dir", d])
    if include_ext:
        cmd.append(f"--include=*.{include_ext}")
    
    # stdout=subprocess.PIPE supaya kita bisa baca hasilnya
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

def main():
    if not os.path.exists("mini"):
        os.makedirs("mini")

    unused_files = []
    unused_deps = []

    # --- BAGIAN 1: AUDIT FILE FISIK (CSS, JS, PY) ---
    if os.path.exists(TARGET_DIR):
        for root, dirs, files in os.walk(TARGET_DIR):
            for file in files:
                if file.endswith(('.css', '.js', '.py')):
                    file_path = os.path.join(root, file)
                    # Cari apakah nama file disebut di luar folder ext dan mini
                    found = run_grep(file, [".git", "node_modules", TARGET_DIR, "mini"])
                    
                    if not found:
                        unused_files.append(file_path)

    # --- BAGIAN 2: AUDIT PACKAGE.JSON ---
    if os.path.exists("package.json"):
        with open("package.json", "r") as f:
            data = json.load(f)
            deps = data.get("dependencies", {}).keys()
            
            for dep in deps:
                # Cari require('dep') atau from 'dep' khusus di file .js
                pattern = f"require(['\"]{dep}['\"])|from\\s+['\"]{dep}['\"]"
                found = run_grep(pattern, [".git", "node_modules"], "js")
                
                if not found:
                    unused_deps.append(dep)

    # --- GENERATE LAPORAN ---
    now = datetime.now().strftime("%d %b %Y %H:%M:%S")
    with open(REPORT_FILE, "w") as f:
        f.write(f"--------------------------------------------------\n")
        f.write(f"LAPORAN AUDIT TOTAL ({now})\n")
        f.write(f"--------------------------------------------------\n\n")
        
        f.write("--- [1] DAFTAR FILE TIDAK TERPAKAI ---\n")
        for uf in unused_files:
            f.write(f"- Jalur: {uf}\n")
            
        f.write("\n--- [2] DAFTAR DEPENDENCIES TIDAK TERPAKAI ---\n")
        for ud in unused_deps:
            f.write(f"- Package: {ud}\n")
            
        f.write(f"\n--------------------------------------------------\n")
        f.write(f"📊 RINGKASAN AUDIT:\n")
        f.write(f"- File bisa dihapus: {len(unused_files)}\n")
        f.write(f"- Package bisa di-uninstall: {len(unused_deps)}\n")
        f.write(f"--------------------------------------------------\n")
        f.write(f"💡 CARA MEMBERSIHKAN: bash {CLEANUP_SCRIPT}\n")

    # --- GENERATE CLEANUP SCRIPT ---
    with open(CLEANUP_SCRIPT, "w") as f:
        f.write("#!/bin/bash\n")
        f.write("echo '🧹 Memulai pembersihan repository...'\n")
        for uf in unused_files:
            f.write(f"rm \"{uf}\"\n")
        if unused_deps:
            f.write(f"npm uninstall {' '.join(unused_deps)}\n")
        f.write("echo '✅ Pembersihan selesai!'\n")
    
    os.chmod(CLEANUP_SCRIPT, 0o755)
    
    # Cetak laporan ke log GitHub
    with open(REPORT_FILE, "r") as f:
        print(f.read())

if __name__ == "__main__":
    main()
