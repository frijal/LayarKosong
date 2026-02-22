use serde_json::Value;
use std::collections::{HashSet, HashMap};
use std::fs;

const BASE_URL: &str = "https://dalam.web.id";

fn slugify(text: &str) -> String {
    text.to_lowercase()
        .trim()
        .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
        .replace(' ', "-")
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("📝 Membuat sitemap.txt (Rust Clean Engine)...");

    // 1. Baca data dari artikel.json
    let data_str = fs::read_to_string("artikel.json")?;
    let data: HashMap<String, Vec<Vec<String>>> = serde_json::from_str(&data_str)?;

    let mut urls = HashSet::new();

    // 2. Proses URL dari artikel.json
    for (category, posts) in data {
        let cat_slug = slugify(&category);
        for post in posts {
            // p[1] adalah filename (misal: /judul-artikel.html)
            let file_name = &post[1];
            let file_slug = file_name
                .trim_start_matches('/')
                .replace(".html", "");

            urls.insert(format!("{}/{}/{}", BASE_URL, cat_slug, file_slug));
        }
    }

    // 3. Daftar URL Manual (Static Pages)
    let static_pages = vec![
        "", "/jejak-sejarah", "/lainnya", "/olah-media",
        "/opini-sosial", "/sistem-terbuka", "/warta-tekno",
        "/gaya-hidup", "/about", "/privacy", "/search",
        "/security-policy", "/data-deletion-form", "/disclaimer",
        "/feed", "/img", "/lisensi", "/sitemap"
    ];

    for page in static_pages {
        urls.insert(format!("{}{}", BASE_URL, page));
    }

    // 4. Urutkan URL agar sitemap rapi (opsional tapi bagus)
    let mut sorted_urls: Vec<_> = urls.into_iter().collect();
    sorted_urls.sort();

    // 5. Tulis ke sitemap.txt
    let output = sorted_urls.join("\n") + "\n";
    fs::write("sitemap.txt", output)?;

    println!("✅ sitemap.txt berhasil dibuat dengan {} URL.", sorted_urls.len());
    Ok(())
}
