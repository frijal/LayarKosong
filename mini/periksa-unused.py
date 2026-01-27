import os
import subprocess
import json
from datetime import datetime

# --- KONFIGURASI ---
TARGET_DIR = "ext"
REPORT_FILE = "mini/unused-package.txt"
CLEANUP_SCRIPT = "mini/auto_cleanup.sh"

def run_grep(pattern, exclude_dirs, include_ext=None):
    """Menjalankan grep dengan aman tanpa mematikan script"""
    # Gunakan -l untuk hanya mendapatkan daftar file, -F untuk fixed string (cepat)
    cmd = ["grep", "-rlF", pattern, "."]
    
    for d in exclude_dirs:
        cmd.extend(["--exclude-dir", d])
    
    if include_ext:
        cmd.append(f"--include=*.{include_ext}")
    
    # Run grep
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip()

def main():
    # --- PATH AWARENESS ---
    # Mendapatkan path absolut folder 'mini' tempat script ini berada
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Pindah ke root repository (satu level di atas 'mini')
    os.chdir(os.path.join(script_dir, ".."))
    
    print(f"🚀 Memulai audit di: {os.getcwd()}")

    # Pastikan folder mini ada untuk simpan laporan
    if not os.path.exists("mini"):
        os.makedirs("mini")

    unused_files = []
    unused_deps = []

    # --- BAGIAN 1: AUDIT FILE FISIK (.css, .js, .py) ---
    if os.path.exists(TARGET_DIR):
        print(f"📂 Scanning folder {TARGET_DIR}...")
        for root, dirs, files in os.walk(TARGET_DIR):
            for file in files:
                if file.endswith(('.css', '.js', '.py')):
                    file_path = os.path.join(root, file)
                    # Cari apakah nama file disebut di luar folder ext dan mini
                    found = run_grep(file, [".git", "node_modules", TARGET_DIR, "mini"])
                    
                    if not found:
                        unused_files.append(file_path)
    else:
        print(f"⚠️ Folder {TARGET_DIR} tidak ditemukan!")

    # --- BAGIAN 2: AUDIT PACKAGE.JSON ---
    if os.path.exists("package.json"):
        print("📦 Memeriksa dependencies di package.json...")
        with open("package.json", "r") as f:
            data = json.load(f)
            deps = data.get("dependencies", {0}).keys()
            
            for dep in deps:
                # Strategi Aman: Cari string nama package di SEMUA file .js, .html, .yml
                # Ini menghindari salah deteksi pada package dengan simbol @ atau /
                found = run_grep(dep, [".git", "node_modules", "mini"])
                
                if not found:
                    unused_deps.append(dep)
    else:
        print("⚠️ package.json tidak ditemukan!")

    # --- GENERATE LAPORAN ---
    now = datetime.now().strftime("%d %b %Y %H:%M:%S")
    with open(REPORT_FILE, "w") as f:
        f.write(f"--------------------------------------------------\n")
        f.write(f"LAPORAN AUDIT TOTAL ({now})\n")
        f.write(f"--------------------------------------------------\n\n")
        
        f.write("--- [1] DAFTAR FILE TIDAK TERPAKAI ---\n")
        if unused_files:
            for uf in unused_files:
                f.write(f"- Jalur: {uf}\n")
        else:
            f.write("(Semua file terpakai)\n")
            
        f.write("\n--- [2] DAFTAR DEPENDENCIES TIDAK TERPAKAI ---\n")
        if unused_deps:
            for ud in unused_deps:
                f.write(f"- Package: {ud}\n")
        else:
            f.write("(Semua package terpakai)\n")
            
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
    
    print(f"✅ Audit Selesai! Laporan disimpan di {REPORT_FILE}")

if __name__ == "__main__":
    main()
