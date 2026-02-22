use anyhow::Result;
use nipper::Document;
use std::fs;
use std::path::{Path};
use url::Url;
use walkdir::WalkDir;

const BASE_URL: &str = "https://dalam.web.id";

// 1:1 dengan escapeHtmlAttr
fn escape_html_attr(text: &str) -> String {
    if text.is_empty() { return String::new(); }
    text.replace('&', "&amp;")
    .replace('"', "&quot;")
    .replace('\'', "’")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
}

// 1:1 dengan prepareDesc
fn prepare_desc(text: &str) -> String {
    let re = regex::Regex::new(r"\s+").unwrap();
    let cleaned = re.replace_all(text, " ");
    escape_html_attr(cleaned.trim())
}

// 1:1 dengan mirrorAndConvert
async fn mirror_and_convert(external_url: &str, base_url: &str) -> String {
    let url = match Url::parse(external_url) {
        Ok(u) => u,
        Err(_) => return external_url.to_string(),
    };

    let base_parsed = Url::parse(base_url).unwrap();
    let hostname = url.host_str().unwrap_or("");
    let base_hostname = base_parsed.host_str().unwrap_or("");

    if hostname == base_hostname || hostname == "localhost" || hostname == "schema.org" {
        return external_url.replace(base_url, "");
    }

    let original_path = url.path();
    let ext = Path::new(original_path).extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
    let is_svg = ext == "svg";
    let final_ext = if is_svg { ".svg" } else { ".webp" };

    let local_path_name = if !ext.is_empty() {
        original_path.replace(&format!(".{}", ext), final_ext)
    } else {
        format!("{}{}", original_path, final_ext)
    };

    let local_path = Path::new("img").join(hostname).join(local_path_name.trim_start_matches('/'));
    let web_path = format!("/{}", local_path.to_string_lossy().replace('\\', "/"));

    if local_path.exists() { return web_path; }

    if let Some(parent) = local_path.parent() { fs::create_dir_all(parent).ok(); }

    let client = reqwest::Client::builder()
    .user_agent("Mozilla/5.0")
    .timeout(std::time::Duration::from_secs(15))
    .build().unwrap();

    if let Ok(res) = client.get(external_url).send().await {
        if let Ok(data) = res.bytes().await {
            if is_svg {
                fs::write(&local_path, data).ok();
            } else if let Ok(img) = image::load_from_memory(&data) {
                let encoder = webp::Encoder::from_image(&img).unwrap();
                fs::write(&local_path, &*encoder.encode(85.0)).ok();
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

    for entry in WalkDir::new(target_folder).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().and_then(|s| s.to_str()) != Some("html") { continue; }

        let file_path = entry.path();
        let raw_content = fs::read_to_string(file_path)?;
        let base_name = file_path.file_name().unwrap().to_string_lossy().to_string();

        println!("🔍 Memproses SEO & Meta Images: {}", base_name);
        let document = Document::from(&raw_content);

        // --- 1. MIRRORING GAMBAR DALAM BODY ---
        let images = document.select("img");
        for mut img in images.iter() {
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
        let title_node = document.select("title");
        let article_title = title_node.text().split(" - ").next().unwrap_or("Layar Kosong").trim().to_string();
        let escaped_title = escape_html_attr(&article_title);
        let clean_file_name = base_name.replace(".html", "");
        let canonical_url = format!("{}/artikel/{}", base_url, clean_file_name);

        let raw_meta_desc = document.select("meta[name='description'], meta[property='description']").attr("content").map(|v| v.to_string()).unwrap_or_default();
        let raw_og_desc = document.select("meta[property='og:description'], meta[name='og:description']").attr("content").map(|v| v.to_string()).unwrap_or_default();
        let raw_tw_desc = document.select("meta[property='twitter:description'], meta[name='twitter:description']").attr("content").map(|v| v.to_string()).unwrap_or_default();

        let first_p = document.select("p").first().text().trim().to_string();
        let fallback = if !first_p.is_empty() {
            let limit = first_p.chars().count().min(160);
            prepare_desc(&first_p.chars().take(limit).collect::<String>())
        } else {
            "Layar Kosong - Catatan dan Opini.".to_string()
        };

        let best_meta = if !raw_meta_desc.is_empty() { raw_meta_desc }
        else if !raw_og_desc.is_empty() { raw_og_desc }
        else if !raw_tw_desc.is_empty() { raw_tw_desc }
        else { fallback };

        let final_desc = prepare_desc(&best_meta);

        let mut meta_img = document.select("meta[name='twitter:image'], meta[property='og:image']").first().attr("content").map(|v| v.to_string())
        .unwrap_or_else(|| document.select("img").first().attr("src").map(|v| v.to_string()).unwrap_or_default());

        if meta_img.starts_with("http") {
            let mirrored = mirror_and_convert(&meta_img, base_url).await;
            if mirrored.starts_with('/') { meta_img = format!("{}{}", base_url, mirrored); }
        }

        let published_time = document.select("meta[property='article:published_time']").attr("content").map(|v| v.to_string());
        let modified_time = document.select("meta[property='article:modified_time']").attr("content").map(|v| v.to_string());

        let mut tags = Vec::new();
        document.select("meta[property='article:tag']").iter().for_each(|el| {
            if let Some(t) = el.attr("content") { tags.push(t.to_string()); }
        });

        // --- 3. BERSIHKAN TAG LAMA ---
        let mut html = document.select("html");
        html.set_attr("lang", "id");
        html.set_attr("prefix", "og: https://ogp.me/ns# article: https://ogp.me/ns/article#");

        document.select("link[rel='canonical'], link[rel='icon'], link[rel='shortcut icon'], link[rel='license']").remove();
        document.select("meta[name='description'], meta[property='description'], meta[property='og:description'], meta[name='og:description'], meta[name='twitter:description'], meta[property='twitter:description']").remove();
        document.select("meta[property^='og:'], meta[name^='twitter:'], meta[property^='twitter:'], meta[property^='article:'], meta[itemprop='image']").remove();
        document.select("meta[name='author'], meta[name='robots'], meta[name='googlebot'], meta[name='theme-color'], meta[name^='bluesky:'], meta[name^='fediverse:']").remove();

        // --- 4. SUNTIK ULANG ---
        let mut head = document.select("head");
        let mut injection = Vec::new();

        // Menggunakan string literal standar ("") bukannya raw string (r#"")
        // untuk baris yang mengandung simbol # agar tidak membingungkan compiler Rust 2021.
        injection.push("<meta property=\"og:locale\" content=\"id_ID\">".to_string());
        injection.push("<meta property=\"og:site_name\" content=\"Layar Kosong\">".to_string());
        injection.push("<link rel=\"icon\" href=\"/favicon.ico\">".to_string());
        injection.push("<link rel=\"manifest\" href=\"/site.webmanifest\">".to_string());
        injection.push(format!("<link rel=\"canonical\" href=\"{}\">", canonical_url));
        injection.push(format!("<meta property=\"og:url\" content=\"{}\">", canonical_url));
        injection.push(format!("<meta property=\"twitter:url\" content=\"{}\">", canonical_url));
        injection.push("<meta property=\"twitter:domain\" content=\"https://dalam.web.id\">".to_string());
        injection.push(format!("<meta property=\"og:title\" content=\"{}\">", escaped_title));
        injection.push(format!("<meta name=\"twitter:title\" content=\"{}\">", escaped_title));
        injection.push("<meta property=\"og:type\" content=\"article\">".to_string());

        // BARIS BERMASALAH: Sekarang kita pakai string literal biasa
        injection.push("<meta name=\"theme-color\" content=\"#00b0ed\">".to_string());

        injection.push("<meta name=\"robots\" content=\"index, follow, max-image-preview:large\">".to_string());
        injection.push("<meta name=\"author\" content=\"Fakhrul Rijal\">".to_string());
        injection.push(format!("<meta name=\"description\" content=\"{}\">", final_desc));
        injection.push(format!("<meta property=\"og:description\" content=\"{}\">", final_desc));
        injection.push(format!("<meta name=\"twitter:description\" content=\"{}\">", final_desc));
        injection.push("<link rel=\"license\" href=\"https://creativecommons.org/publicdomain/zero/1.0/\">".to_string());
        injection.push("<meta name=\"twitter:creator\" content=\"@responaja\">".to_string());
        injection.push("<meta name=\"bluesky:creator\" content=\"@dalam.web.id\">".to_string());
        injection.push("<meta name=\"fediverse:creator\" content=\"@frijal@mastodon.social\">".to_string());
        injection.push("<meta name=\"googlebot\" content=\"max-image-preview:large\">".to_string());
        injection.push("<meta name=\"twitter:site\" content=\"@responaja\">".to_string());
        injection.push("<meta property=\"article:author\" content=\"https://facebook.com/frijal\">".to_string());
        injection.push("<meta property=\"article:publisher\" content=\"https://facebook.com/frijalpage\">".to_string());
        injection.push("<meta property=\"fb:app_id\" content=\"175216696195384\">".to_string());

        if !meta_img.is_empty() {
            injection.push(format!("<meta itemprop=\"image\" content=\"{}\">", meta_img));
            injection.push(format!("<meta name=\"twitter:image\" content=\"{}\">", meta_img));
            injection.push(format!("<meta property=\"twitter:image\" content=\"{}\">", meta_img));
            injection.push(format!("<meta property=\"og:image\" content=\"{}\">", meta_img));
            injection.push(format!("<meta property=\"og:image:alt\" content=\"{}\">", escaped_title));
            injection.push("<meta property=\"og:image:width\" content=\"1200\">".to_string());
            injection.push("<meta property=\"og:image:height\" content=\"675\">".to_string());
            injection.push("<meta name=\"twitter:card\" content=\"summary_large_image\">".to_string());
        }

        for tag in tags {
            injection.push(format!("<meta property=\"article:tag\" content=\"{}\">", tag));
        }

        if let Some(t) = published_time {
            injection.push(format!("<meta property=\"article:published_time\" content=\"{}\">", t));
        }
        if let Some(t) = modified_time {
            injection.push(format!("<meta property=\"article:modified_time\" content=\"{}\">", t));
        }

        head.append_html(format!("\n    {}\n", injection.join("\n    ")));

        // --- 5. BODY FIXES ---
        let body_imgs = document.select("img");
        for mut img in body_imgs.iter() {
            if img.attr("alt").is_none() {
                img.set_attr("alt", &article_title);
            }
        }

        fs::write(file_path, document.html().to_string())?;
    }
    println!("\n✅ SEO Fixer: Selesai! Deskripsi & Gambar Sosmed aman.");
    Ok(())
}
