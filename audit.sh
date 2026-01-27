#!/bin/bash

# --- KONFIGURASI ---
TARGET_DIR="ext"
HTML_DIR="artikel"
WORKFLOW_DIR=".github/workflows"
REPORT_FILE="audit_final_report.txt"

echo "🔎 Memulai Ultimate Audit Repository [Layar Kosong]..."
echo "--------------------------------------------------" > $REPORT_FILE
echo "LAPORAN AUDIT TOTAL ($(date))" >> $REPORT_FILE
echo "--------------------------------------------------" >> $REPORT_FILE

# Variabel penghitung
UNUSED_FILES=0
UNUSED_DEPS=0

# --- BAGIAN 1: AUDIT FILE FISIK (CSS, JS, PY) ---
echo "--- [1] Memeriksa File di $TARGET_DIR ---"
echo "--- [1] DAFTAR FILE TIDAK TERPAKAI ---" >> $REPORT_FILE

# Cari semua file target
FILES=$(find "$TARGET_DIR" -type f \( -name "*.css" -o -name "*.js" -o -name "*.py" \))

for FILEPATH in $FILES; do
    FILENAME=$(basename "$FILEPATH")
    
    # Cari jejak nama file di: Folder Artikel, Root, dan Workflows
    # Kita kecualikan folder .git, folder ext itu sendiri, dan file laporan
    SEARCH_RESULT=$(grep -r "$FILENAME" "$HTML_DIR" "$WORKFLOW_DIR" "." \
        --exclude-dir=".git" \
        --exclude-dir="$TARGET_DIR" \
        --exclude-dir="node_modules" \
        --exclude="$REPORT_FILE" \
        2>/dev/null)

    if [ -z "$SEARCH_RESULT" ]; then
        echo "❌ TIDAK TERPAKAI: $FILENAME"
        echo "- Jalur: $FILEPATH" >> $REPORT_FILE
        ((UNUSED_FILES++))
    else
        echo "✅ DIGUNAKAN    : $FILENAME"
    fi
done

# --- BAGIAN 2: AUDIT PACKAGE.JSON (DEPENDENCIES) ---
echo -e "\n--- [2] Memeriksa package.json ---"
echo -e "\n--- [2] DAFTAR DEPENDENCIES TIDAK TERPAKAI ---" >> $REPORT_FILE

if [ -f "package.json" ]; then
    # Ambil daftar dependencies menggunakan jq
    DEPS=$(jq -r '.dependencies | keys[]' package.json 2>/dev/null)
    
    if [ -z "$DEPS" ]; then
        echo "ℹ️  Tidak ada dependencies ditemukan di package.json." >> $REPORT_FILE
    else
        for DEP in $DEPS; do
            # Cari pola: require('dep') atau from 'dep'
            SEARCH_DEP=$(grep -rE "require\(['\"]$DEP['\"]\)|from\s+['\"]$DEP['\"]" . \
                --include="*.js" \
                --exclude-dir="node_modules" \
                --exclude="package.json" \
                2>/dev/null)
            
            if [ -z "$SEARCH_DEP" ]; then
                echo "❌ UNUSED DEP   : $DEP"
                echo "- Package: $DEP (Saran: npm uninstall $DEP)" >> $REPORT_FILE
                ((UNUSED_DEPS++))
            else
                echo "✅ USED DEP     : $DEP"
            fi
        done
    fi
else
    echo "⚠️  package.json tidak ditemukan. Melewati audit tahap 2." >> $REPORT_FILE
fi

# --- RINGKASAN AKHIR ---
echo -e "\n--------------------------------------------------" >> $REPORT_FILE
echo "📊 RINGKASAN AUDIT:" >> $REPORT_FILE
echo "- Total File Nganggur: $UNUSED_FILES" >> $REPORT_FILE
echo "- Total Package Nganggur: $UNUSED_DEPS" >> $REPORT_FILE
echo "--------------------------------------------------" >> $REPORT_FILE

echo -e "\n✅ Audit Selesai!"
echo "📊 Hasil lengkap bisa kamu intip di: $REPORT_FILE"

if [ $UNUSED_FILES -gt 0 ] || [ $UNUSED_DEPS -gt 0 ]; then
    echo "⚠️  Ditemukan beberapa item yang tidak digunakan. Cek file laporan untuk detailnya."
else
    echo "🎉 Bersih, bro! Semua file dan package sepertinya masih terpakai."
fi
