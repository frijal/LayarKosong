use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;
use url::Url;

/**
 * CONFIGURATION
 */
const JSON_FILE: &str = "artikel.json";
const DATABASE_FILE: &str = "mini/posted-tumblr.txt";
const BLOG_NAME: &str = "frijal";
const BASE_URL: &str = "https://dalam.web.id";

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct Post(String, String, String, String, Option<String>);

fn slugify(text: &str) -> String {
    text.to_lowercase()
        .trim()
        .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
        .replace(' ', "-")
}

fn clean_tag(t: &str) -> String {
    t.replace('&', "dan")
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .trim()
        .to_string()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🎨 Memulai Tumblr Autopost (Rust Engine)...");

    // 1. Ambil Kunci Rahasia
    let consumer_key = env::var("TUMBLR_CONSUMER_KEY").expect("TUMBLR_CONSUMER_KEY not set");
    let consumer_secret = env::var("TUMBLR_CONSUMER_SECRET").expect("TUMBLR_CONSUMER_SECRET not set");
    let token = env::var("TUMBLR_TOKEN").expect("TUMBLR_TOKEN not set");
    let token_secret = env::var("TUMBLR_TOKEN_SECRET").expect("TUMBLR_TOKEN_SECRET not set");

    // 2. Baca Database
    let posted_database = if Path::new(DATABASE_FILE).exists() {
        fs::read_to_string(DATABASE_FILE)?
    } else {
        String::new()
    };

    // 3. Parse Artikel
    let data_str = fs::read_to_string(JSON_FILE).expect("artikel.json tidak ditemukan");
    let data: HashMap<String, Vec<Post>> = serde_json::from_str(&data_str)?;

    let mut all_articles = Vec::new();
    for (category, posts) in data {
        let cat_slug = slugify(&category);
        for p in posts {
            let file_slug = p.1.trim_start_matches('/').replace(".html", "");
            if file_slug.startsWith("agregat-20") { continue; }

            let full_url = format!("{}/{}/{}", BASE_URL, cat_slug, file_slug);
            if !posted_database.contains(&file_slug) {
                all_articles.push((p, full_url, category.clone()));
            }
        }
    }

    all_articles.sort_by(|a, b| b.0.3.cmp(&a.0.3));

    if all_articles.is_empty() {
        println!("✅ Tumblr: Tidak ada artikel baru.");
        return Ok(());
    }

    let (target_data, target_url, category_name) = &all_articles[0];
    println!("🚀 Mengirim ke Tumblr: {}", target_data.0);

    // 4. Siapkan Konten NPF (Neue Post Format) Tumblr
    let content = json!([
        { "type": "text", "text": target_data.4.as_deref().unwrap_or("Archive.") },
        { "type": "text", "text": "#fediverse #Indonesia" },
        { "type": "link", "url": target_url }
    ]);

    let tags = vec!["fediverse", "Repost", "Ngopi", "Indonesia", category_name];
    let cleaned_tags: String = tags.iter().map(|t| clean_tag(t)).collect::<Vec<_>>().join(",");

    // 5. OAuth Signature & Request
    let api_url = format!("https://api.tumblr.com/v2/blog/{}/posts", BLOG_NAME);
    let consumer = oauth1::Token::new(consumer_key, consumer_secret);
    let access = oauth1::Token::new(token, token_secret);

    let mut params = HashMap::new();
    params.insert("content", content.to_string());
    params.insert("tags", cleaned_tags);

    let header = oauth1::authorize("POST", &api_url, &consumer, Some(&access), Some(params));

    let client = reqwest::Client::new();
    let response = client
        .post(&api_url)
        .header(reqwest::header::AUTHORIZATION, header)
        .form(&[
            ("content", content.to_string()),
            ("tags", cleaned_tags)
        ])
        .send()
        .await?;

    if response.status().is_success() {
        let mut file = fs::OpenOptions::new().append(true).create(true).open(DATABASE_FILE)?;
        use std::io::Write;
        writeln!(file, "{}", target_url)?;
        println!("✅ Berhasil post ke Tumblr!");
    } else {
        eprintln!("❌ Gagal: {}", response.text().await?);
    }

    Ok(())
}
