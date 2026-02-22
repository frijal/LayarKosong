use regex::{Regex, Captures};
use std::fs;
use std::path::Path;

// ======================================================
// KONFIGURASI TARGET FOLDER
// ======================================================
const TARGET_FOLDERS: &[&str] = &[
    "gaya-hidup",
    "jejak-sejarah",
    "lainnya",
    "olah-media",
    "opini-sosial",
    "sistem-terbuka",
    "warta-tekno",
];

fn clean_html(html: &str) -> String {
    // --- FASE 1: SAPU JAGAT ---
    // Mengubah <pre>`code`</pre> menjadi <pre><code>code</code></pre>
    let re_sapu = Regex::new(r"(?i)<pre>`([\s\S]*?)`</pre>").unwrap();
    let mut updated = re_sapu.replace_all(html, "<pre><code>$1</code></pre>").to_string();

    // --- FASE 2: CLEANUP TEXT ---
    // Bold, Italic, Strikethrough
    let re_bold = Regex::new(r"(?i)<(?:strong|b)>(.*?)</(?:strong|b)>").unwrap();
    updated = re_bold.replace_all(&updated, "**$1**").to_string();

    let re_italic = Regex::new(r"(?i)<(?:em|i)>(.*?)</(?:em|i)>").unwrap();
    updated = re_italic.replace_all(&updated, "*$1*").to_string();

    let re_strike = Regex::new(r"(?i)<(?:del|s|strike)>(.*?)</(?:del|s|strike)>").unwrap();
    updated = re_strike.replace_all(&updated, "~~$1~~").to_string();

    // --- FASE 3: SMART LINK CONVERSION ---
    let re_link = Regex::new(r"(?i)<a href=[\x22\x27]([^"']*)[\x22\x27][^>]*>([\s\S]*?)</a>").unwrap();
    let re_protect = Regex::new(r"(?i)class=|id=|style=|target=|rel=").unwrap();
    let re_img = Regex::new(r"(?i)<img\s[^>]*>").unwrap();

    updated = re_link.replace_all(&updated, |caps: &Captures| {
        let full_match = &caps[0];
        let url = &caps[1];
        let text = &caps[2];

        let is_protected = re_protect.is_match(full_match);
        let contains_img = re_img.is_match(text);

        if is_protected || contains_img {
            full_match.to_string()
        } else {
            format!("[{}]({})", text, url)
        }
    }).to_string();

    // --- FASE 4: SMART INLINE CODE ---
    let re_inline = Regex::new(r"(?is)<pre[\s\S]*?</pre>|<code>([\s\S]*?)</code>").unwrap();

    updated = re_inline.replace_all(&updated, |caps: &Captures| {
        let full_match = &caps[0];

        // Jika itu tag <pre>, biarkan apa adanya
        if full_match.to_lowercase().starts_with("<pre") {
            return full_match.to_string();
        }

        // Jika itu tag <code>
        if let Some(code_text) = caps.get(1) {
            let code_content = code_text.as_str();
            let has_newline = code_content.contains('\n') || code_content.contains('\r');
            let is_complex = full_match.contains("class=") || full_match.contains("id=");

            if !has_newline && !is_complex {
                return format!("`{}`", code_content);
            }
        }
        full_match.to_string()
    }).to_string();

    updated
}

fn process_folder(dir: &Path) {
    if !dir.exists() {
        println!("⚠️ Folder tidak ditemukan: {:?}", dir);
        return;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_dir() {
                process_folder(&path);
            } else {
                let file_name = path.file_name().unwrap().to_string_lossy().to_lowercase();

                if file_name.ends_with(".html") && file_name != "index.html" {
                    if let Ok(content) = fs::read_to_string(&path) {
                        let updated = clean_html(&content);

                        if content != updated {
                            fs::write(&path, updated).expect("Gagal menulis file");
                            println!("   ✅ Clean: {:?}", path.file_name().unwrap());
                        }
                    }
                }
            }
        }
    }
}

fn main() {
    println!("---------------------------------------------------------");
    println!("🚀 Memulai Operasi \"Layar Kosong Bersih\" (Rust Engine)");
    println!("---------------------------------------------------------");

    for folder in TARGET_FOLDERS {
        println!("📂 Processing: /{}", folder);
        let target_path = Path::new(folder);
        process_folder(target_path);
    }

    println!("---------------------------------------------------------");
    println!("🏁 Selesai! Semua artikel kini lebih ramping.");
    println!("---------------------------------------------------------");
}
