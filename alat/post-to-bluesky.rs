use atrium_api::agent::atp_agent::AtpAgent;
use atrium_api::app::bsky::embed::external::{Main as EmbedExternal, External};
use atrium_api::app::bsky::feed::post::Record;
use atrium_api::types::string::Datetime;
use atrium_xrpc_client::reqwest::ReqwestClient;
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;

const JSON_FILE: &str = "artikel.json";
const DATABASE_FILE: &str = "mini/posted-bluesky.txt";
const DOMAIN_URL: &str = "https://dalam.web.id";

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
    println!("🦋 Memulai Bluesky Autopost (Rust Engine)...");

    // 1. Load data artikel
    let data_str = fs::read_to_string(JSON_FILE).expect("artikel.json tidak ditemukan");
    let data: HashMap<String, Vec<Post>> = serde_json::from_str(&data_str)?;

    // 2. Load Database posted
    let posted_database = if Path::new(DATABASE_FILE).exists() {
        fs::read_to_string(DATABASE_FILE)?
    } else {
        String::new()
    };

    let mut all_posts = Vec::new();

    // 3. Parsing & Filtering
    for (category, posts) in data {
        let cat_slug = slugify(&category);
        for p in posts {
            let file_name = &p[1];
            let file_slug = file_name.trim_start_matches('/').replace(".html", "");

            if file_slug.starts_with("agregat-20") { continue; }

            let full_url = format!("{}/{}/{}", DOMAIN_URL, cat_slug, file_slug);

            if !posted_database.contains(&file_slug) {
                all_posts.push((p, full_url, file_slug));
            }
        }
    }

    // Sort by Date (Post[3] adalah ISO Date)
    all_posts.sort_by(|a, b| b.0 .3.cmp(&a.0 .3));

    if all_posts.is_empty() {
        println!("✅ Tidak ada artikel baru untuk Bluesky.");
        return Ok(());
    }

    let (target_data, target_url, target_slug) = &all_posts[0];

    // 4. Bluesky Login
    let handle = env::var("BSKY_HANDLE").expect("BSKY_HANDLE not set");
    let password = env::var("BSKY_PASSWORD").expect("BSKY_PASSWORD not set");

    let agent = AtpAgent::new(
        ReqwestClient::new("https://bsky.social".to_string()),
        atrium_api::agent::store::MemorySessionStore::default(),
    );

    agent.login(&handle, &password).await?;

    // 5. Upload Image for Embed
    let img_url = &target_data.2;
    let img_bytes = reqwest::get(img_url).await?.bytes().await?;

    let upload = agent
        .api()
        .com::atproto::repo::upload_blob(img_bytes.to_vec())
        .await?;

    // 6. Create Embed External (Link Card)
    let embed = EmbedExternal {
        external: External {
            description: target_data.4.clone().unwrap_or_else(|| "Archive.".to_string()),
            title: target_data.0.clone(),
            thumb: Some(upload.data.blob),
            uri: target_url.clone(),
        },
    };

    // 7. Send Post
    let mut msg = target_data.4.clone().unwrap_or_else(|| "Archive.".to_string());
    if msg.chars().count() > 297 {
        msg = msg.chars().take(297).collect::<String>() + "...";
    }

    agent
        .api()
        .app::bsky::feed::post::create(
            agent.session().await.unwrap().did,
            Record {
                text: msg,
                created_at: Datetime::now(),
                embed: Some(atrium_api::app::bsky::feed::post::RecordEmbed::AppBskyEmbedExternalMain(Box::new(embed))),
                ..Default::default()
            },
        )
        .await?;

    // 8. Logging untuk GitHub Actions
    fs::write("/tmp/temp_new_url_bsky.txt", format!("{}\n", target_url))?;
    println!("✅ Berhasil posting ke Bluesky: {}", target_url);

    Ok(())
}
