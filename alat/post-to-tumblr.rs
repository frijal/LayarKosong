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

// ... (Bagian atas dan struct tetap sama) ...

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // ... (Bagian ambil ENV dan baca JSON tetap sama) ...

    let (target_data, target_url, category_name) = &all_articles[0];

    // 4. Siapkan Konten & Tags
    let content_json = json!([
        { "type": "text", "text": target_data.4.as_deref().unwrap_or("Archive.") },
                             { "type": "text", "text": "#fediverse #Indonesia" },
                             { "type": "link", "url": target_url }
    ]).to_string();

    let tags_list = vec!["fediverse", "Repost", "Ngopi", "Indonesia", category_name];
    let cleaned_tags: String = tags_list.iter().map(|t| clean_tag(t)).collect::<Vec<_>>().join(",");

    // 5. OAuth 1.0 Signature (Update untuk oauth1 v1.0)
    let api_url = format!("https://api.tumblr.com/v2/blog/{}/posts", BLOG_NAME);

    // Di versi 1.0, kita buat signature langsung dengan params
    let mut params = HashMap::new();
    params.insert("content", content_json.as_str());
    params.insert("tags", cleaned_tags.as_str());

    let header = oauth1::authorize(
        "POST",
        &api_url,
        &oauth1::Token::new(consumer_key, consumer_secret),
                                   Some(&oauth1::Token::new(token, token_secret)),
                                   Some(params)
    );

    // 6. Kirim Request
    let client = reqwest::Client::new();
    let response = client
    .post(&api_url)
    .header(reqwest::header::AUTHORIZATION, header)
    .form(&[
        ("content", content_json),
          ("tags", cleaned_tags)
    ])
    .send()
    .await?;

    if response.status().is_success() {
        // ... (Bagian tulis database tetap sama) ...
        println!("✅ Berhasil post ke Tumblr!");
    } else {
        eprintln!("❌ Gagal: {}", response.text().await?);
    }

    Ok(())
}
