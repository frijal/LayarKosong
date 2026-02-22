use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;

/**
 * CONFIGURATION
 */
const JSON_FILE: &str = "artikel.json";
const DATABASE_FILE: &str = "mini/posted-discord.txt";
const BASE_URL: &str = "https://dalam.web.id";
const BOT_NAME: &str = "Layar Kosong";
const BOT_AVATAR: &str = "https://dalam.web.id/favicon.png";

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct Post(String, String, String, String, Option<String>);

fn slugify(text: &str) -> String {
    text.to_lowercase()
    .trim()
    .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
    .replace(' ', "-")
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🎮 Memulai Discord Autopost (Rust Engine)...");

    // 1. Ambil Webhook dari Environment
    let webhook_url = match env::var("DISCORD_WEBHOOK_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("❌ Error: DISCORD_WEBHOOK_URL belum diset.");
            std::process::exit(1);
        }
    };

    // 2. Baca Database artikel yang sudah diposting
    let posted_database = if Path::new(DATABASE_FILE).exists() {
        fs::read_to_string(DATABASE_FILE)?
    } else {
        String::new()
    };

    // 3. Parse artikel.json
    let data_str = fs::read_to_string(JSON_FILE).expect("artikel.json tidak ditemukan");
    let data: HashMap<String, Vec<Post>> = serde_json::from_str(&data_str)?;

    let mut all_articles = Vec::new();

    for (category, posts) in data {
        let cat_slug = slugify(&category);
        for p in posts {
            // Mapping: 0:title, 1:filename, 2:img, 3:date, 4:desc
            let file_slug = p.1.trim_start_matches('/').replace(".html", "");

            // Skip agregat/rekap
            if file_slug.starts_with("agregat-20") {
                continue;
            }

            let full_url = format!("{}/{}/{}", BASE_URL, cat_slug, file_slug);

            // Cek apakah URL sudah pernah diposting
            if !posted_database.contains(&full_url) {
                all_articles.push((p, full_url));
            }
        }
    }

    // 4. Urutkan berdasarkan tanggal (paling baru di atas)
    all_articles.sort_by(|a, b| b.0.3.cmp(&a.0.3));

    if all_articles.is_empty() {
        println!("🏁 Discord: Semua artikel sudah terposting.");
        return Ok(());
    }

    // 5. Ambil target artikel terbaru
    let (target_data, target_url) = &all_articles[0];
    let title = &target_data.0;
    let description = target_data.4.as_deref().unwrap_or("Archive.");

    println!("🚀 Mengirim ke Discord: {}", title);

    // 6. Siapkan Payload (Plain Text sesuai script JS kamu)
    let message_content = format!("{}\n\n**{}**\n{}", target_url, title, description);

    let payload = json!({
        "username": BOT_NAME,
        "avatar_url": BOT_AVATAR,
        "content": message_content
    });

    // 7. Kirim ke Discord Webhook
    let client = reqwest::Client::new();
    let response = client
    .post(&webhook_url)
    .json(&payload)
    .send()
    .await?;

    if response.status().is_success() {
        // 8. Simpan ke database file (append URL)
        let mut file = fs::OpenOptions::new()
        .append(true)
        .create(true)
        .open(DATABASE_FILE)?;

        use std::io::Write;
        writeln!(file, "{}", target_url)?;

        println!("✅ Berhasil! Artikel terposting ke Discord.");
    } else {
        let error_text = response.text().await?;
        eprintln!("❌ Gagal posting: {}", error_text);
        std::process::exit(1);
    }

    Ok(())
}
