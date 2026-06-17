#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil

LIST_FILE = Path("affected-files.txt")
CARI = "komponen"
GANTI = "lemak"

if not LIST_FILE.exists():
    raise SystemExit("ERROR: affected-files.txt tidak ditemukan.")

files = [
    Path(line.strip())
    for line in LIST_FILE.read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.strip().startswith("#")
]

timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")

def show_context(text, start, end, radius=90):
    left = max(0, start - radius)
    right = min(len(text), end + radius)

    before = text[left:start]
    match = text[start:end]
    after = text[end:right]

    snippet = before + "[" + match + "]" + after
    snippet = snippet.replace("\n", "\\n")

    return snippet

total_replaced = 0
total_skipped = 0

for path in files:
    if not path.exists():
        print(f"LEWATI, file tidak ada: {path}")
        continue

    text = path.read_text(encoding="utf-8", errors="replace")

    positions = []
    idx = 0
    while True:
        idx = text.find(CARI, idx)
        if idx == -1:
            break
        positions.append(idx)
        idx += len(CARI)

    if not positions:
        continue

    print("\n" + "=" * 80)
    print(f"FILE: {path}")
    print(f"Ditemukan {len(positions)} kemunculan '{CARI}'")
    print("=" * 80)

    new_parts = []
    last = 0
    replaced_in_file = 0
    skipped_in_file = 0
    replace_all_in_file = False

    for i, start in enumerate(positions, start=1):
        end = start + len(CARI)

        new_parts.append(text[last:start])

        if replace_all_in_file:
            new_parts.append(GANTI)
            replaced_in_file += 1
            last = end
            continue

        print()
        print(f"[{i}/{len(positions)}]")
        print(show_context(text, start, end))
        print()
        ans = input("Ganti ini ke 'lemak'? [y] ya, [n] tidak, [a] semua sisa di file ini, [q] keluar: ").strip().lower()

        if ans == "q":
            new_parts.append(text[start:])
            new_text = "".join(new_parts)

            if replaced_in_file > 0:
                backup = path.with_suffix(path.suffix + f".bak-{timestamp}")
                shutil.copy2(path, backup)
                path.write_text(new_text, encoding="utf-8")
                print(f"Backup dibuat: {backup}")
                print(f"Ditulis: {path}")

            print("\nDihentikan oleh user.")
            print(f"Total diganti: {total_replaced + replaced_in_file}")
            print(f"Total dilewati: {total_skipped + skipped_in_file}")
            raise SystemExit

        elif ans == "a":
            new_parts.append(GANTI)
            replaced_in_file += 1
            replace_all_in_file = True

        elif ans == "y":
            new_parts.append(GANTI)
            replaced_in_file += 1

        else:
            new_parts.append(text[start:end])
            skipped_in_file += 1

        last = end

    new_parts.append(text[last:])
    new_text = "".join(new_parts)

    if replaced_in_file > 0:
        backup = path.with_suffix(path.suffix + f".bak-{timestamp}")
        shutil.copy2(path, backup)
        path.write_text(new_text, encoding="utf-8")

        print()
        print(f"Backup dibuat: {backup}")
        print(f"Direvert: {path}")
        print(f"Diganti: {replaced_in_file}, dilewati: {skipped_in_file}")
    else:
        print()
        print(f"Tidak ada perubahan ditulis untuk: {path}")

    total_replaced += replaced_in_file
    total_skipped += skipped_in_file

print("\nSELESAI")
print(f"Total diganti: {total_replaced}")
print(f"Total dilewati: {total_skipped}")
