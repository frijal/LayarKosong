use anyhow::Result;
use nipper::Document;
use std::fs;
use std::path::{Path, PathBuf};
use url::Url;
use walkdir::WalkDir;

const BASE_URL: &str = "https://dalam.web.id";

// Identik dengan escapeHtmlAttr
fn escape_html_attr(text: &str) -> String {
    if text.is_empty() { return "".to_string(); }
    text.replace('&', "&amp;")
    .replace('"', "&quot;")
    .replace('\'', "’")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
}

// Identik dengan prepareDesc
fn prepare_desc(text: &str) -> String {
    let re = regex::Regex::new(r"\s+").unwrap();
    let cleaned = re.replace_all(text, " ");
    escape_html_attr(cleaned.trim())
}

// Identik dengan mirrorAndConvert
async fn mirror_and_convert(external_url: &str, base_url: &str) -> String {
    let url = match Url::parse(external_url) {
        Ok(u) => u,
        Err(_) => return external_url.to_string(),
    };

    let base_parsed = Url::parse(base_url).unwrap();
    let hostname = url.host_str().unwrap_or("");
    let base_hostname = base_parsed.host_str().unwrap_or("");

    // Logika bypass hostname
    if hostname == base_hostname || hostname == "localhost" || hostname == "schema.org" {
        return external_url.replace(base_url, "");
    }

    let original_path = url.path();
    let ext = Path::new(original_path)
    .extension()
    .and_then(|s| s.to_str())
    .unwrap_or("")
    .to_lowercase();

    let is_svg = ext == "svg";
    let final_ext = if is_svg { ".svg" } else { ".webp" };

    // localPathName logic
    let local_path_name = if !ext.is_empty() {
        original_path.replace(&format!(".{}", ext), final_ext)
    } else {
        format!("{}{}", original_path, final_ext)
    };

    let local_path = Path::new("img").join(hostname).join(local_path_name.trim_start_matches('/'));
    let dir_path = local_path.parent().unwrap();

    // Normalisasi path ke forward slash (untuk web)
    let web_path = format!("/{}", local_path.to_string_loss_y().replace('\\', "/"));

    if local_path.exists() {
        return web_path;
    }

    fs::create_dir_all(dir_path).ok();

    let client = reqwest::Client::builder()
    .user_agent("Mozilla/5.0")
    .timeout(std::time::Duration::from_secs(15))
    .build().unwrap();

    if let Ok(res) = client.get(external_url).send().await {
        if let Ok(data) = res.bytes().await {
            if is_svg {
                fs::write(&local_path, data).ok();
            } else {
                // Sharp replacement: image + webp crate
                if let Ok(img) = image::load_from_memory(&data) {
                    let encoder = webp::Encoder::from_image(&img).unwrap();
                    let webp_data = encoder.encode(85.0);
                    fs::write(&local_path, &*webp_data).ok();
                }
            }
            return web_path;
        }
    }

    external_url.to_string()
}

#[tokio::main]
async fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    let target_folder = args.get(1).map(|s| s.as_str()).unwrap_or("artikel");
    let base_url = BASE_URL.trim_end_matches('/');

    println!("Memulai proses SEO...");

    for entry in WalkDir::new(target_folder).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().and_then(|s| s.to_str()) != Some("html") {
            continue;
        }

        let file_path = entry.path();
        let raw_content = fs::read_to_string(file_path)?;
        let base_name = file_path.file_name().unwrap().to_string_lossy();

        println!("\n🔍 Memproses SEO & Meta Images: {}", base_name);

        let document = Document::from(&raw_content);

        // --- 1. MIRRORING GAMBAR DALAM BODY ---
        let mut img_els = document.select("img");
        for i in 0..img_els.length() {
            let mut img = img_els.eq(i);
            if let Some(src) = img.attr("src") {
                let src_str = src.to_string();
                if src_str.starts_with("http") {
                    let local = mirror_and_convert(&src_str, base_url).await;
                    if local.starts_with('/') {
                        img.set_attr("src", &format!("{}{}", base_url, local));
                    }
                }
            }
        }

        // --- 2. LOGIKA DATA SEO ---
        let article_title = document.select("title").text().split(" - ").next().unwrap_or("Layar Kosong").trim().to_string();
        let escaped_title = escape_html_attr(&article_title);
        let clean_file_name = base_name.replace(".html", "");
        let canonical_url = format!("{}/artikel/{}", base_url, clean_file_name);

        // Deskripsi (Selektor fleksibel)
        let raw_meta_desc = document.select("meta[name='description'], meta[property='description']").attr("content").unwrap_or_default().to_string();
        let raw_og_desc = document.select("meta[property='og:description'], meta[name='og:description']").attr("content").unwrap_or_default().to_string();
        let raw_twitter_desc = document.select("meta[property='twitter:description'], meta[name='twitter:description']").attr("content").unwrap_or_default().to_string();

        let first_p = document.select("p").first().text().trim().to_string();
        let fallback = if !first_p.is_empty() {
            let limit = first_p.chars().count().min(160);
            prepare_desc(&first_p.chars().take(limit).collect::<String>())
        } else {
            "Layar Kosong - Catatan dan Opini.".to_string()
        };

        let best_meta = if !raw_meta_desc.is_empty() { raw_meta_desc }
        else if !raw_og_desc.is_empty() { raw_og_desc }
        else if !raw_twitter_desc.is_empty() { raw_twitter_desc }
        else { fallback };

        let final_meta_desc = prepare_desc(&best_meta);

        // Gambar Sosmed
        let mut meta_img_url = document.select("meta[property='twitter:image']").attr("content")
        .or(document.select("meta[name='twitter:image']").attr("content"))
        .or(document.select("meta[property='og:image']").attr("content"))
        .or(document.select("img").first().attr("src"))
        .unwrap_or_default().to_string();

        if meta_img_url.starts_with("http") {
            let mirrored = mirror_and_convert(&meta_img_url, base_url).await;
            if mirrored.starts_with('/') { meta_img_url = format!("{}{}", base_url, mirrored); }
        }

        let published_time = document.select("meta[property='article:published_time']").attr("content");
        let modified_time = document.select("meta[property='article:modified_time']").attr("content");

        let mut existing_tags = Vec::new();
        document.select("meta[property='article:tag']").each(|_, el| {
            if let Some(tag) = el.attr("content") { existing_tags.push(tag.to_string()); }
        });

        // --- 3. BERSIHKAN TAG LAMA ---
        let mut html_root = document.select("html");
        html_root.set_attr("lang", "id");
        html_root.set_attr("prefix", "og: https://ogp.me/ns# article: https://ogp.me/ns/article#");

        document.select("link[rel='canonical'], link[rel='icon'], link[rel='shortcut icon'], link[rel='license']").remove();
        document.select("meta[name='description'], meta[property='description'], meta[property='og:description'], meta[name='og:description'], meta[name='twitter:description'], meta[property='twitter:description']").remove();
        document.select("meta[property^='og:'], meta[name^='twitter:'], meta[property^='twitter:'], meta[property^='article:'], meta[itemprop='image']").remove();
        document.select("meta[name='author'], meta[name='robots'], meta[name='googlebot'], meta[name='theme-color'], meta[name^='bluesky:'], meta[name^='fediverse:']").remove();

        // --- 4. SUNTIK ULANG ---
        let mut head = document.select("head");

        // Gunakan Vec untuk menampung baris meta agar lebih rapi dan aman
        let mut tags = Vec::new();
        tags.push(format!(r#"<meta property="og:locale" content="id_ID">"#));
        tags.push(format!(r#"<meta property="og:site_name" content="Layar Kosong">"#));
        tags.push(format!(r#"<link rel="icon" href="/favicon.ico">"#));
        tags.push(format!(r#"<link rel="manifest" href="/site.webmanifest">"#));
        tags.push(format!(r#"<link rel="canonical" href="{}">"#, canonical_url));
        tags.push(format!(r#"<meta property="og:url" content="{}">"#, canonical_url));
        tags.push(format!(r#"<meta property="twitter:url" content="{}">"#, canonical_url));
        tags.push(format!(r#"<meta property="twitter:domain" content="https://dalam.web.id">"#));
        tags.push(format!(r#"<meta property="og:title" content="{}">"#, escaped_title));
        tags.push(format!(r#"<meta name="twitter:title" content="{}">"#, escaped_title));
        tags.push(format!(r#"<meta property="og:type" content="article">"#));
        tags.push(format!(r#"<meta name="theme-color" content="#00b0ed">"#));
        tags.push(format!(r#"<meta name="robots" content="index, follow, max-image-preview:large">"#));
        tags.push(format!(r#"<meta name="author" content="Fakhrul Rijal">"#));
        tags.push(format!(r#"<meta name="description" content="{}">"#, final_meta_desc));
        tags.push(format!(r#"<meta property="og:description" content="{}">"#, final_meta_desc));
        tags.push(format!(r#"<meta name="twitter:description" content="{}">"#, final_meta_desc));
        tags.push(format!(r#"<link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">"#));
        tags.push(format!(r#"<meta name="twitter:creator" content="@responaja">"#));
        tags.push(format!(r#"<meta name="bluesky:creator" content="@dalam.web.id">"#));
        tags.push(format!(r#"<meta name="fediverse:creator" content="@frijal@mastodon.social">"#));
        tags.push(format!(r#"<meta name="googlebot" content="max-image-preview:large">"#));
        tags.push(format!(r#"<meta name="twitter:site" content="@responaja">"#));
        tags.push(format!(r#"<meta property="article:author" content="https://facebook.com/frijal">"#));
        tags.push(format!(r#"<meta property="article:publisher" content="https://facebook.com/frijalpage">"#));
        tags.push(format!(r#"<meta property="fb:app_id" content="175216696195384">"#));

        if !meta_img_url.is_empty() {
            tags.push(format!(r#"<meta itemprop="image" content="{}">"#, meta_img_url));
            tags.push(format!(r#"<meta name="twitter:image" content="{}">"#, meta_img_url));
            tags.push(format!(r#"<meta property="twitter:image" content="{}">"#, meta_img_url));
            tags.push(format!(r#"<meta property="og:image" content="{}">"#, meta_img_url));
            tags.push(format!(r#"<meta property="og:image:alt" content="{}">"#, escaped_title));
            tags.push(format!(r#"<meta property="og:image:width" content="1200">"#));
            tags.push(format!(r#"<meta property="og:image:height" content="675">"#));
            tags.push(format!(r#"<meta name="twitter:card" content="summary_large_image">"#));
        }

        for tag in existing_tags {
            tags.push(format!(r#"<meta property="article:tag" content="{}">"#, tag));
        }

        if let Some(t) = published_time {
            tags.push(format!(r#"<meta property="article:published_time" content="{}">"#, t));
        }
        if let Some(t) = modified_time {
            tags.push(format!(r#"<meta property="article:modified_time" content="{}">"#, t));
        }

        // Gabungkan semua tag dengan newline dan indentasi
        let final_head_html = tags.join("\n    ");
        head.append_html(format!("\n    {}\n", final_head_html));

        // --- 5. BODY FIXES ---
        let mut body_imgs = document.select("img");
        for i in 0..body_imgs.length() {
            let mut img = body_imgs.eq(i);
            if img.attr("alt").is_none() {
                img.set_attr("alt", &article_title);
            }
        }

        fs::write(file_path, document.html().to_string())?;
    }

    println!("\n✅ SEO Fixer: Selesai! Deskripsi & Gambar Sosmed aman.");
    Ok(())
}
