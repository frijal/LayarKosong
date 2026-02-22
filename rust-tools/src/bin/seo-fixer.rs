use anyhow::{anyhow, Result};
use glob::glob;
use lol_html::{element, html_content::ContentType, HtmlRewriter, Settings};
use scraper::{Html, Selector};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use url::Url;

// --- UTILS: Mirror & Convert (Logika Sharp/Axios ke Rust) ---
async fn mirror_and_convert(external_url: &str, base_url: &str) -> Result<String> {
    let url = Url::parse(external_url)?;
    let base_parsed = Url::parse(base_url)?;

    // Skip jika domain sendiri, localhost, atau schema.org
    if url.host_str() == base_parsed.host_str() || url.host_str() == Some("localhost") || url.host_str() == Some("schema.org") {
        return Ok(external_url.replace(base_url, ""));
    }

    let host = url.host_str().unwrap_or("unknown");
    let path_segments = url.path();
    let ext = Path::new(path_segments).extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();

    let is_svg = ext == "svg";
    let final_ext = if is_svg { "svg" } else { "webp" };

    // Path lokal: img/hostname/path.webp
    let mut local_path = PathBuf::from("../img");
    local_path.push(host);
    let relative_path = path_segments.trim_start_matches('/');
    local_path.push(relative_path);
    local_path.set_extension(final_ext);

    if local_path.exists() {
        return Ok(format!("/{}", local_path.strip_prefix("../")?.to_str().unwrap().replace("\\", "/")));
    }

    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent)?;
    }

    println!("   📥 Downloading: {}", external_url);
    let client = reqwest::Client::builder().user_agent("Mozilla/5.0").build()?;
    let resp = client.get(external_url).send().await?.bytes().await?;

    if is_svg {
        fs::write(&local_path, resp)?;
    } else {
        let img = image::load_from_memory(&resp)?;
        let memory = webp::Encoder::from_image(&img)
        .map_err(|_| anyhow!("WebP Encode Error"))?
        .encode(85.0);
        fs::write(&local_path, &*memory)?;
    }

    Ok(format!("/{}", local_path.strip_prefix("../")?.to_str().unwrap().replace("\\", "/")))
}

fn escape_html_attr(text: &str) -> String {
    text.replace('&', "&amp;")
    .replace('"', "&quot;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('\'', "’")
}

fn prepare_desc(text: &str) -> String {
    let cleaned = text.split_whitespace().collect::<Vec<_>>().join(" ");
    escape_html_attr(&cleaned)
}

#[tokio::main]
async fn main() -> Result<()> {
    let base_url = "https://dalam.web.id";
    let target_folder = std::env::args().nth(2).unwrap_or_else(|| "../artikel".to_string());
    let pattern = format!("{}/*.html", target_folder);
    let mut total_processed = 0;

    for entry in glob(&pattern)? {
        let path = entry?;
        let raw_content = fs::read_to_string(&path)?;
        let file_name = path.file_stem().unwrap().to_str().unwrap();

        println!("🔍 Memproses SEO & Meta Images: {}.html", file_name);

        // --- PASS 1: EKSTRAKSI DATA (Mirroring & Data SEO) ---
        let document = Html::parse_document(&raw_content);
        let mut img_map = HashMap::new();

        // A. Title & Canonical
        let title_tag = document.select(&Selector::parse("title").unwrap()).next()
        .map(|e| e.text().collect::<String>()).unwrap_or_default();
        let article_title = title_tag.split(" - ").next().unwrap_or("Layar Kosong").trim();
        let escaped_title = escape_html_attr(article_title);
        let canonical_url = format!("{}/artikel/{}", base_url, file_name);

        // B. Mirroring Gambar dalam Body
        for el in document.select(&Selector::parse("img").unwrap()) {
            if let Some(src) = el.value().attr("src") {
                if src.starts_with("http") && !img_map.contains_key(src) {
                    if let Ok(local) = mirror_and_convert(src, base_url).await {
                        img_map.insert(src.to_string(), format!("{}{}", base_url, local));
                    }
                }
            }
        }

        // C. Logika Deskripsi (Best Description)
        let raw_meta_desc = document.select(&Selector::parse("meta[name='description'], meta[property='description']").unwrap())
        .next().and_then(|e| e.value().attr("content")).unwrap_or("");
        let raw_og_desc = document.select(&Selector::parse("meta[property='og:description'], meta[name='og:description']").unwrap())
        .next().and_then(|e| e.value().attr("content")).unwrap_or("");
        let raw_twitter_desc = document.select(&Selector::parse("meta[property='twitter:description'], meta[name='twitter:description']").unwrap())
        .next().and_then(|e| e.value().attr("content")).unwrap_or("");

        let first_p = document.select(&Selector::parse("p").unwrap()).next()
        .map(|e| e.text().collect::<String>()).unwrap_or_default();
        let fallback = if !first_p.is_empty() {
            let end = first_p.chars().count().min(160);
            prepare_desc(&first_p.chars().take(end).collect::<String>())
        } else {
            "Layar Kosong - Catatan dan Opini.".to_string()
        };

        let best_meta = if !raw_meta_desc.is_empty() { raw_meta_desc }
        else if !raw_og_desc.is_empty() { raw_og_desc }
        else if !raw_twitter_desc.is_empty() { raw_twitter_desc }
        else { &fallback };

        let final_desc = prepare_desc(best_meta);

        // D. Meta Image Sosial Media
        let mut meta_img_url = document.select(&Selector::parse("meta[property='twitter:image'], meta[name='twitter:image'], meta[property='og:image']").unwrap())
        .next().and_then(|e| e.value().attr("content")).unwrap_or("");

        if meta_img_url.is_empty() {
            meta_img_url = document.select(&Selector::parse("img").unwrap()).next().and_then(|e| e.value().attr("src")).unwrap_or("");
        }

        let mut final_meta_img = meta_img_url.to_string();
        if meta_img_url.starts_with("http") {
            if let Ok(local) = mirror_and_convert(meta_img_url, base_url).await {
                final_meta_img = format!("{}{}", base_url, local);
            }
        }

        // E. Waktu & Tags
        let published_time = document.select(&Selector::parse("meta[property='article:published_time']").unwrap()).next().and_then(|e| e.value().attr("content"));
        let modified_time = document.select(&Selector::parse("meta[property='article:modified_time']").unwrap()).next().and_then(|e| e.value().attr("content"));
        let mut tags = Vec::new();
        for el in document.select(&Selector::parse("meta[property='article:tag']").unwrap()) {
            if let Some(c) = el.value().attr("content") { tags.push(c.to_string()); }
        }

        // --- PASS 2: REWRITING (Sesuai Logika Suntik Ulang Node.js) ---
        let mut output = Vec::new();
        {
            let mut rewriter = HtmlRewriter::new(
                Settings {
                    element_content_handlers: vec![
                        element!("html", |el| {
                            el.set_attribute("lang", "id")?;
                            el.set_attribute("prefix", "og: https://ogp.me/ns# article: https://ogp.me/ns/article#")?;
                            Ok(())
                        }),
                        // BERSIHKAN TAG LAMA (Sesuai script: link canonical, icon, license, meta desc, og, twitter, robots, dll)
                        element!("link[rel='canonical'], link[rel='icon'], link[rel='shortcut icon'], link[rel='license']", |el| { el.remove(); Ok(()) }),
                                                 element!("meta[name='description'], meta[property='description'], meta[property^='og:'], meta[name^='twitter:'], meta[property^='twitter:'], meta[property^='article:'], meta[itemprop='image']", |el| { el.remove(); Ok(()) }),
                                                 element!("meta[name='author'], meta[name='robots'], meta[name='googlebot'], meta[name='theme-color'], meta[name^='bluesky:'], meta[name^='fediverse:']", |el| { el.remove(); Ok(()) }),

                                                 // SUNTIK ULANG (Bagian 4 pada script asli)
                                                 element!("head", |el| {
                                                     let mut inject = format!(
                                                         r#"
                                                         <meta property="og:locale" content="id_ID">
                                                         <meta property="og:site_name" content="Layar Kosong">
                                                         <link rel="icon" href="/favicon.ico">
                                                         <link rel="manifest" href="/site.webmanifest">
                                                         <link rel="canonical" href="{canonical}">
                                                         <meta property="og:url" content="{canonical}">
                                                         <meta property="twitter:url" content="{canonical}">
                                                         <meta property="twitter:domain" content="https://dalam.web.id">
                                                         <meta property="og:title" content="{title}">
                                                         <meta name="twitter:title" content="{title}">
                                                         <meta property="og:type" content="article">
                                                         <meta name="theme-color" content="#00b0ed">
                                                         <meta name="robots" content="index, follow, max-image-preview:large">
                                                         <meta name="author" content="Fakhrul Rijal">
                                                         <meta name="description" content="{desc}">
                                                         <meta property="og:description" content="{desc}">
                                                         <meta name="twitter:description" content="{desc}">
                                                         <link rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">
                                                         <meta name="twitter:creator" content="@responaja">
                                                         <meta name="bluesky:creator" content="@dalam.web.id">
                                                         <meta name="fediverse:creator" content="@frijal@mastodon.social">
                                                         <meta name="googlebot" content="max-image-preview:large">
                                                         <meta name="twitter:site" content="@responaja">
                                                         <meta property="article:author" content="https://facebook.com/frijal">
                                                         <meta property="article:publisher" content="https://facebook.com/frijalpage">
                                                         <meta property="fb:app_id" content="175216696195384">"#,
                                                         canonical = canonical_url, title = escaped_title, desc = final_desc
                                                     );

                                                     if !final_meta_img.is_empty() {
                                                         inject.push_str(&format!(
                                                             r#"
                                                             <meta itemprop="image" content="{img}">
                                                             <meta name="twitter:image" content="{img}">
                                                             <meta property="twitter:image" content="{img}">
                                                             <meta property="og:image" content="{img}">
                                                             <meta property="og:image:alt" content="{title}">
                                                             <meta property="og:image:width" content="1200">
                                                             <meta property="og:image:height" content="675">
                                                             <meta name="twitter:card" content="summary_large_image">"#,
                                                             img = final_meta_img, title = escaped_title));
                                                 }

                                                 for tag in &tags {
                                                     inject.push_str(&format!(r#"
                                                     <meta property="article:tag" content="{}">"#, tag));
                                                 }

                                                 if let Some(p) = published_time { inject.push_str(&format!(r#"<meta property="article:published_time" content="{}">"#, p)); }
                                                 if let Some(m) = modified_time { inject.push_str(&format!(r#"<meta property="article:modified_time" content="{}">"#, m)); }

                                                 el.append(&inject, ContentType::Html);
                                                     Ok(())
                                                 }),
                                                 // BODY FIXES
                                                 element!("img", |el| {
                                                 // Mirroring body images
                                                 if let Some(src) = el.get_attribute("src") {
                                                     if let Some(local_src) = img_map.get(&src) {
                                                         el.set_attribute("src", local_src)?;
                                                 }
                                                 }
                                                 // Alt tag
                                                 if el.get_attribute("alt").unwrap_or_default().is_empty() {
                                                     el.set_attribute("alt", article_title)?;
                                                 }
                                                 Ok(())
                                                 }),
                    ],
                    ..Settings::default()
                                                 },
                                                 |c: &[u8]| output.extend_from_slice(c),
                                                     );

                                                     rewriter.write(raw_content.as_bytes())?;
                                                     rewriter.end()?;
                                                 }

                                                 fs::write(&path, output)?;
                                                 total_processed += 1;
                                                 }

                                                 println!("\n✅ SEO Fixer: Selesai! {} file sudah dipoles.", total_processed);
                                                     Ok(())
                                                 }
