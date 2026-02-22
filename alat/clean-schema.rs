use std::env;
use std::fs;
use std::path::Path;
use regex::Regex;

fn main() {
    // 1. Ambil folder dari argument atau default ke './artikelx/'
    let args: Vec<String> = env::args().collect();
    let target_folder = args.get(1).map(|s| s.as_str()).unwrap_or("./artikelx/");

    // 2. Regex untuk ld+json (Case Insensitive & Multiline diatur via flag (?is))
    // (?is) -> i: case-insensitive, s: allow . to match newline (\n)
    let schema_regex = Regex::new(r"(?is)<script\s+type=[\x22\x27]application/ld\+json[\x22\x27]>.*?</script>").unwrap();

    let path = Path::new(target_folder);
    if !path.exists() {
        eprintln!("❌ Folder tidak ditemukan: {}", target_folder);
        return;
    }

    println!("🧹 Memulai pembersihan STRICT LOCAL (RUST) di: {:?}", path.canonicalize().unwrap_or(path.to_path_buf()));
    println!("⚠️  Non-Recursive Mode: Sub-folder tidak akan disentuh.");
    println!("{}", "-".repeat(50));

    let mut count_cleaned = 0;
    let mut count_total = 0;

    // 3. Baca isi folder (Strict Local)
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            
            // Pastikan hanya file dan berakhiran .html / .htm
            if file_path.is_file() {
                let ext = file_path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
                if ext == "html" || ext == "htm" {
                    count_total += 1;
                    
                    if let Ok(content) = fs::read_to_string(&file_path) {
                        if schema_regex.is_match(&content) {
                            let cleaned_content = schema_regex.replace_all(&content, "");
                            if fs::write(&file_path, cleaned_content.as_ref()).is_ok() {
                                println!("✅ Cleaned: {:?}", file_path.file_name().unwrap());
                                count_cleaned += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    println!("{}", "-".repeat(50));
    println!("📊 HASIL PEMBERSIHAN (RUST VERSION)");
    println!("📂 Total file HTML ditemukan : {}", count_total);
    println!("✨ File yang dibersihkan      : {}", count_cleaned);
    println!("😴 File sudah bersih          : {}", count_total - count_cleaned);
    println!("{}", "-".repeat(50));
}
