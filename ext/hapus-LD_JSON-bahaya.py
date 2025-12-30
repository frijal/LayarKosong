import os
import re

TARGET_DIR = "artikel"

SCHEMA_REGEX = re.compile(
    r'<script\s+type=["\']application/ld\+json["\'][^>]*>.*?</script>',
    re.DOTALL | re.IGNORECASE
)

removed_count = 0
file_count = 0

for root, _, files in os.walk(TARGET_DIR):
    for file in files:
        if not file.endswith(".html"):
            continue

        path = os.path.join(root, file)

        with open(path, "r", encoding="utf-8") as f:
            original = f.read()

        cleaned = re.sub(SCHEMA_REGEX, "", original)

        if cleaned != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(cleaned)
            removed_count += 1

        file_count += 1

print(f"🧹 Schema dihapus dari {removed_count} file (diperiksa {file_count} file)")
