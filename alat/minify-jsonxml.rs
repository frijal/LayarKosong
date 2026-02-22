use std::fs;
use std::path::Path;
use serde_json::Value;

// ======================================================
// DAFTAR FILE TARGET
// ======================================================
const FILES_TO_MINIFY: &[&str] = &[
    "./artikel.json",
    "./rss.xml",
    "./sitemap.xml",
    "./sitemap-1.xml",
    "./image-sitemap-1.xml",
    "./video-sitemap-1.xml",
    "./feed-gaya-hidup.xml",
    "./feed-jejak-sejarah.xml",
    "./feed-lainnya.xml",
    "./feed-olah-media.xml",
    "./feed-opini-sosial.xml",
    "./feed-sistem-terbuka.xml",
    "./feed-warta-tekno.xml"
];

fn main() {
    println!("🧹 Memulai operasi Sapu Jagat (Minify Data)...");
    println!("📂 Lokasi: Balikpapan | Engine: Rust 🚀");

    for file_path in FILES_TO_MINIFY {
        let path = Path::new(file_path);

        if !path.exists() {
            continue;
        }

        match fs::read_to_string(path) {
            Ok(content) => {
                let original_size = content.len();
                let extension = path.extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_lowercase();

                let new_content = if extension == "json" {
                    // Strategi JSON: Parse lalu stringify tanpa indentasi
                    match serde_json::from_str::<Value>(&content) {
                        Ok(json_data) => serde_json::to_string(&json_data).unwrap_or(content),
                        Err(_) => content,
                    }
                } else if extension == "xml" {
                    // Strategi XML: Hapus spasi/newline antar tag
                    // Menggunakan Regex sederhana atau replace manual
                    content.replace(">\n", ">")
                           .replace("\n", "")
                           .replace(">  <", "><")
                           .replace("> <", "><")
                           .trim()
                           .to_string()
                } else {
                    content
                };

                let new_size = new_content.len();

                if let Err(e) = fs::write(path, &new_content) {
                    println!("❌ Gagal menulis {}: {}", file_path, e);
                } else {
                    let saving = if original_size > 0 {
                        ((original_size - new_size) as f64 / original_size as f64) * 100.0
                    } else {
                        0.0
                    };

                    println!(
                        "✅ {}: Hemat {:.2}% (Sekarang: {:.2} KB)",
                        file_path,
                        saving,
                        (new_size as f64 / 1024.0)
                    );
                }
            },
            Err(e) => println!("❌ Gagal membaca {}: {}", file_path, e),
        }
    }

    println!("---------------------------------------------------------");
    println!("🏁 Selesai! Data Layar Kosong kini super ramping.");
    println!("---------------------------------------------------------");
}
