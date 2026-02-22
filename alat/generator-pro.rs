use anyhow::Result;
use chrono::{DateTime, Utc};
use rayon::prelude::*;
use regex::{Regex};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, LazyLock, Mutex};

// ===================================================================
// DATA STRUCTURES
// ===================================================================
struct CategoryDefinition {
    name: &'static str,
    keywords: &'static [&'static str],
}

type ArticleTuple = (String, String, String, String, String);

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Article {
    title: String,
    file: String,
    img: String,
    lastmod: String,
    desc: String,
    category: String,
    loc: String,
}

// ===================================================================
// DATA KATEGORI (MASUKKAN KEYWORD DI SINI)
// ===================================================================
static CATEGORIES: &[CategoryDefinition] = &[
    CategoryDefinition {
        name: "Sistem Terbuka",
        keywords: &["apt", "arch", "aur", "bash", "blankon", "bootable", "bsd", "btrfs", "cachyos", "chroot", "compiz", "conky", "cooling", "debian", "desktop", "distro", "dotfiles", "dpkg", "ext4", "fedora", "flatpak", "floorp", "foss", "garuda", "glibc", "gnome", "grub", "hyprland", "kde", "kernel", "komunitas", "kpli", "linux", "lts", "mageia", "mirror", "mx-linux", "nano", "nixos", "open source", "opensuse", "oss", "pacman", "partition", "paru", "perl", "repo", "rescuezilla", "rev", "root", "rsync", "sebarubuntu", "shell", "slackware", "snap", "solaris", "sudo", "systemd", "tar", "ubuntu", "ubuntu party", "usb", "ventoy", "vim", "wayland", "xfce", "yum", "zorin", "zsync"],
    },
CategoryDefinition {
    name: "Olah Media",
    keywords: &["audio", "av1", "batch-rename", "bitrate", "canvas", "codec", "compress", "convert", "deoldify", "dpi", "durasi", "exif", "excel", "ffmpeg", "film", "format", "foto", "framerate", "gabung", "gambar", "ghostscript", "gimp", "grayscale", "h264", "h265", "handbrake", "imagemagick", "iptv", "kompres", "layers", "libreoffice", "metadata", "mewarnai", "mkv", "mp3", "mp4", "multimedia", "ocr", "ogg", "openoffice", "pdftk", "png", "potong", "preset", "rekam", "recursive", "resize", "scan", "split", "spreadsheet", "srt", "subtitle", "svg", "transcribe", "vector", "video", "vlc", "watermark", "webp"],
},
CategoryDefinition {
    name: "Jejak Sejarah",
    keywords: &["adab", "akidah", "al-andalus", "andalusia", "aqidah", "ayub", "baghdad", "bahtera", "baitul-hikmah", "barqa", "bilal", "daulah", "doa", "fatih", "fatwa", "fiqh", "fitnah", "ghibah", "hadis", "haki", "halal", "haram", "hijab", "hijrah", "hijriyah", "hittin", "hukum", "ibnu batutah", "ikhlas", "imam", "iman", "islam", "istighfar", "isra", "janji", "jumat", "khalifah", "khwarizmi", "madinah", "madyan", "masjid", "masyitoh", "maulid", "mesir", "muamalah", "muhammadiyah", "mukjizat", "murad", "musa", "mushaf", "muslim", "nabi", "nuh", "pahlawan", "penaklukan", "perjanjian", "persia", "pertempuran", "piagam", "quran", "qunut", "ramadhan", "risalah", "sabar", "saf", "salam", "salman", "sejarah", "seljuk", "shalat", "shalahuddin", "sirah", "sombong", "sunnah", "surga", "syariat", "tabayun", "tabi'in", "tabut", "tauhid", "tawadhu", "uhud", "umar", "utsman", "utsmaniyah", "yaqub", "yarmuk", "yerusalem", "yusuf", "zaid"],
},
CategoryDefinition {
    name: "Gaya Hidup",
    keywords: &["angkringan", "arabica", "bahagia", "bali", "bandara", "bekapai", "berkendara", "boker", "camilan", "detox", "diet", "e-bpkb", "gaul", "gaya hidup", "gejala", "gerimis", "herbal", "hobi", "hotel", "jagung", "jajanan", "jogja", "kafein", "kesehatan", "kopi", "kerupuk", "kuliner", "kurma", "laundry", "lifestyle", "metode", "minuman", "motor", "ngopi", "niat", "nutrisi", "obat", "ojol", "parkir", "pecel", "pencernaan", "pijat", "psikotes", "resep", "respiro", "robusta", "sakit", "seduh", "sembelit", "service", "sikat", "sparepart", "staycation", "susu", "tidur", "touring", "unboxing", "vixion", "wanita", "wisata"],
},
CategoryDefinition {
    name: "Opini Sosial",
    keywords: &["aci", "adaro", "amanah", "audit", "bisnis", "budaya", "bukalapak", "catatan", "cpns", "cuti", "duit", "ekonomi", "ekspedisi", "etika", "fenomena", "golput", "grobogan", "harian", "hormat", "ibu", "indonesia", "integritas", "iwan fals", "jatos", "jne", "kasih", "kebijakan", "kejujuran", "kepemimpinan", "kerja", "kinerja", "kolom", "kopdar", "korporasi", "kota", "kreativitas", "kritik", "masyarakat", "nostalgia", "opini", "organisasi", "pajak", "pemerintah", "penjilat", "perencanaan", "perjalanan", "perusahaan", "poac", "politik", "ppdb", "produktifitas", "pt", "rencana", "renungan", "sktm", "sosial", "subsidi", "uang", "ujian nasional", "umkm", "viral", "whoosh"],
},
CategoryDefinition {
    name: "Warta Tekno",
    keywords: &["ai", "amd", "android", "api", "automation", "backend", "baterai", "benchmarking", "blogspot", "bootloader", "branch", "browser", "build", "facebook", "canva", "chatgpt", "claude", "cleanup", "cloudflare", "codespaces", "cpu", "curl", "cyber-security", "deep-learning", "dns", "domain", "drive", "encryption", "endpoint", "eula", "firefox", "frontend", "fullstack", "gadget", "gemini", "git", "github", "gitignore", "gorilla glass", "grammarly", "hardware", "hdd", "head", "header", "hosting", "html", "iot", "javascript", "jasper", "jaringan", "json", "js", "kate", "keyring", "laptop", "learning", "lisensi", "llm", "markdown", "meta", "mic", "microsoft exchange", "notion", "npm", "optimasi", "osborne1", "overclock", "pdf", "phishing", "internet", "piracy", "powerbank", "prompt", "pwa", "push", "quickbooks", "refresh", "robots.txt", "samba", "schema", "security", "shutdown", "software", "ssh", "ssh3", "ssd", "ssl", "static site", "sturnus", "tema", "thermal-paste", "thunderbird", "tidio", "tools", "trojan", "virtualbox", "vivaldi", "web", "website", "wifi", "windows", "winget", "wine", "workflow", "yaml", "yml", "foss", "microsoft"],
}
];

// ===================================================================
// KONFIGURASI TERPUSAT
// ===================================================================
const BASE_URL: &str = "https://dalam.web.id";
const ARTIKEL_DIR: &str = "./artikel";
const MASTER_JSON: &str = "./artikel/artikel.json";
const TEMPLATE_KATEGORI: &str = "./artikel/-/template-kategori.html";
const JSON_OUT: &str = "artikel.json";
const SITEMAP_TXT: &str = "sitemap.txt";
const RSS_LIMIT: usize = 30;

// ===================================================================
// REGEX ENGINE
// ===================================================================
static RE_TITLE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)<title>([\s\S]*?)</title>").unwrap());
static RE_DESC: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']"#).unwrap());
static RE_PUB_DATE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']"#).unwrap());
static RE_OG_IMAGE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']"#).unwrap());
static RE_IFRAME: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<iframe[^>]+src=["']([^"']+)["']"#).unwrap());
static RE_CANONICAL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*/?>"#).unwrap());
static RE_OG_URL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*/?>"#).unwrap());
static RE_EMOJI: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\p{Emoji_Presentation}\s*").unwrap());

// ===================================================================
// HELPERS
// ===================================================================

// Fungsi ini yang melakukan pencarian kategori berdasarkan judul
fn title_to_category(title: &str) -> String {
    let title_lower = title.to_lowercase();
    for cat in CATEGORIES {
        for keyword in cat.keywords {
            if title_lower.contains(&keyword.to_lowercase()) {
                return cat.name.to_string();
            }
        }
    }
    "Lainnya".to_string()
}

fn slugify(text: &str) -> String {
    text.to_lowercase().trim()
    .replace(" & ", "-and-")
    .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
    .split_whitespace()
    .collect::<Vec<_>>()
    .join("-")
}

fn sanitize_title(raw: &str) -> String {
    RE_EMOJI.replace(raw, "").trim().to_string()
}

fn get_mime_type(url: &str) -> &'static str {
    if url.ends_with(".png") { "image/png" }
    else if url.ends_with(".webp") { "image/webp" }
    else if url.ends_with(".gif") { "image/gif" }
    else if url.ends_with(".svg") { "image/svg+xml" }
    else { "image/jpeg" }
}

fn build_rss(title: &str, items: &[Article], rss_link: &str, description: &str) -> String {
    let now = Utc::now().to_rfc2822();
    let items_xml: String = items.iter().map(|it| {
        format!(r#"
            <item>
            <title><![CDATA[{}]]></title>
            <link><![CDATA[{}]]></link>
            <guid><![CDATA[{}]]></guid>
            <description><![CDATA[{}]]></description>
            <pubDate>{}</pubDate>
            <category><![CDATA[{}]]></category>
            <enclosure url="{}" length="0" type="{}" />
            </item>"#,
            it.title, it.loc, it.loc,
            if it.desc.is_empty() { sanitize_title(&it.title) } else { it.desc.clone() },
                it.lastmod, it.category, it.img, get_mime_type(&it.img))
    }).collect();

    format!(r#"<?xml version="1.0" encoding="UTF-8" ?>
        <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
        <channel>
        <title><![CDATA[{}]]></title>
        <link><![CDATA[{}/]]></link>
        <description><![CDATA[{}]]></description>
        <language>id-ID</language>
        <atom:link href="{}" rel="self" type="application/rss+xml" />
        <lastBuildDate>{}</lastBuildDate>
        {}
        </channel>
        </rss>"#, title, BASE_URL, description, rss_link, now, items_xml)
}

// ===================================================================
// CORE PROCESSOR
// ===================================================================
fn main() -> Result<()> {
    println!("🚀 Memulai Rust Generator V8.6 (Tiered Gateway Mode)...");

    let etalase_raw = fs::read_to_string(JSON_OUT).unwrap_or_else(|_| "{}".to_string());
    let etalase_data: HashMap<String, Vec<ArticleTuple>> = serde_json::from_str(&etalase_raw).unwrap_or_default();

    let master_raw = fs::read_to_string(MASTER_JSON).unwrap_or_else(|_| "{}".to_string());
    let master_data: HashMap<String, Vec<ArticleTuple>> = serde_json::from_str(&master_raw).unwrap_or_default();

    let sitemap_content = fs::read_to_string(SITEMAP_TXT).unwrap_or_default();
    let processed_urls: HashSet<String> = sitemap_content.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect();

    let files_on_disk: Vec<PathBuf> = fs::read_dir(ARTIKEL_DIR)?
    .filter_map(|e| e.ok())
    .map(|e| e.path())
    .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("html"))
    .collect();

    let all_items_flat = Arc::new(Mutex::new(Vec::<Article>::new()));
    let valid_files_cleaning = Arc::new(Mutex::new(HashSet::<String>::new()));
    let final_root_data = Arc::new(Mutex::new(HashMap::<String, Vec<ArticleTuple>>::new()));

    files_on_disk.par_iter().for_each(|path| {
        let file_name = path.file_name().unwrap().to_string_lossy().to_string();
        let mut article_info: Option<(ArticleTuple, String)> = None;

        for (cat, items) in &etalase_data {
            if let Some(found) = items.iter().find(|it| it.1 == file_name) {
                let loc = format!("{}/{}/{}", BASE_URL, slugify(cat), file_name.replace(".html", ""));
                if processed_urls.contains(&loc) {
                    article_info = Some((found.clone(), cat.clone()));
                    break;
                }
            }
        }

        if article_info.is_none() {
            for (cat, items) in &master_data {
                if let Some(found) = items.iter().find(|it| it.1 == file_name) {
                    println!("♻️  Gate 3 (Master): Mendistribusikan {}", file_name);
                    let loc = format!("{}/{}/{}", BASE_URL, slugify(cat), file_name.replace(".html", ""));
                    let _ = process_and_distribute(&file_name, cat, &loc, None);
                    article_info = Some((found.clone(), cat.clone()));
                    break;
                }
            }
        }

        if article_info.is_none() {
            if let Ok(content) = fs::read_to_string(path) {
                println!("✨ Gate 4 (Discovery): Memproses file baru {}", file_name);
                let title = RE_TITLE.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()).unwrap_or_else(|| "Tanpa Judul".to_string());

                // MENGGUNAKAN FUNGSI KEYWORD DI SINI
                let category = title_to_category(&title);
                let loc = format!("{}/{}/{}", BASE_URL, slugify(&category), file_name.replace(".html", ""));

                let desc = RE_DESC.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()).unwrap_or_default();
                let date = RE_PUB_DATE.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string())
                .unwrap_or_else(|| {
                    let metadata = fs::metadata(path).ok();
                    metadata.and_then(|m| m.modified().ok()).map(|t| DateTime::<Utc>::from(t).to_rfc3339()).unwrap_or_default()
                });
                let img = RE_OG_IMAGE.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string())
                .unwrap_or_else(|| format!("{}/img/{}.webp", BASE_URL, file_name.replace(".html", "")));

                let new_data = (title.clone(), file_name.clone(), img, date, desc);
                let _ = process_and_distribute(&file_name, &category, &loc, Some(&content));
                article_info = Some((new_data, category));
            }
        }

        if let Some((data, cat)) = article_info {
            let loc = format!("{}/{}/{}", BASE_URL, slugify(&cat), file_name.replace(".html", ""));
            let article = Article {
                title: data.0.clone(),
                                      file: data.1.clone(),
                                      img: data.2.clone(),
                                      lastmod: data.3.clone(),
                                      desc: data.4.clone(),
                                      category: cat.clone(),
                                      loc,
            };

            valid_files_cleaning.lock().unwrap().insert(format!("{}/{}", slugify(&cat), file_name));
            all_items_flat.lock().unwrap().push(article);
            final_root_data.lock().unwrap().entry(cat).or_default().push(data);
        }
    });

    let mut final_items = Arc::try_unwrap(all_items_flat).unwrap().into_inner().unwrap();
    final_items.sort_by(|a, b| b.lastmod.cmp(&a.lastmod));

    let mut root_map = Arc::try_unwrap(final_root_data).unwrap().into_inner().unwrap();
    for items in root_map.values_mut() {
        items.sort_by(|a, b| b.3.cmp(&a.3));
    }

    fs::write(JSON_OUT, serde_json::to_string_pretty(&root_map)?)?;
    fs::write(SITEMAP_TXT, final_items.iter().map(|it| it.loc.clone()).collect::<Vec<_>>().join("\n"))?;

    let mut xml_posts = String::new();
    let mut xml_images = String::new();
    let mut xml_videos = String::new();

    for item in &final_items {
        xml_posts.push_str(&format!("  <url>\n    <loc>{}</loc>\n    <lastmod>{}</lastmod>\n  </url>\n", item.loc, item.lastmod));
        xml_images.push_str(&format!(
            "  <url>\n    <loc>{}</loc>\n    <lastmod>{}</lastmod>\n    <image:image>\n      <image:loc>{}</image:loc>\n      <image:caption><![CDATA[{}]]></image:caption>\n    </image:image>\n  </url>\n",
            item.loc, item.lastmod, item.img, item.title
        ));

        if let Ok(content) = fs::read_to_string(Path::new(ARTIKEL_DIR).join(&item.file)) {
            for cap in RE_IFRAME.captures_iter(&content) {
                let mut src = cap[1].to_string();
                if src.ends_with(".js") { continue; }
                if src.starts_with("//") { src = format!("https:{}", src); }

                    let thumb = if src.contains("embed/") {
                        let id = src.split("embed/").last().unwrap_or("").split('?').next().unwrap_or("");
                        format!("https://img.youtube.com/vi/{}/hqdefault.jpg", id)
                    } else {
                        format!("{}/img/default-video.webp", BASE_URL)
                    };

                    xml_videos.push_str(&format!(
                        "  <url>\n    <loc>{}</loc>\n    <lastmod>{}</lastmod>\n    <video:video>\n      <video:thumbnail_loc>{}</video:thumbnail_loc>\n      <video:title><![CDATA[{}]]></video:title>\n      <video:description><![CDATA[{}]]></video:description>\n      <video:player_loc>{}</video:player_loc>\n    </video:video>\n  </url>\n",
                        item.loc, item.lastmod, thumb, item.title, if item.desc.is_empty() { format!("Video dari {}", item.title) } else { item.desc.clone() }, src.replace('&', "&amp;")
                    ));
            }
        }
    }

    let xsl_header = format!("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<?xml-stylesheet type=\"text/xsl\" href=\"/sitemap-style.xsl\"?>\n");
    let latest_mod = final_items.first().map(|i| i.lastmod.clone()).unwrap_or_else(|| Utc::now().to_rfc3339());

    fs::write("sitemap.xml", format!("{}<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <sitemap><loc>{}/sitemap-1.xml</loc><lastmod>{}</lastmod></sitemap>\n  <sitemap><loc>{}/image-sitemap-1.xml</loc><lastmod>{}</lastmod></sitemap>\n  <sitemap><loc>{}/video-sitemap-1.xml</loc><lastmod>{}</lastmod></sitemap>\n</sitemapindex>", xsl_header, BASE_URL, latest_mod, BASE_URL, latest_mod, BASE_URL, latest_mod))?;
    fs::write("sitemap-1.xml", format!("{}<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{}</urlset>", xsl_header, xml_posts))?;
    fs::write("image-sitemap-1.xml", format!("{}<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">\n{}</urlset>", xsl_header, xml_images))?;
    fs::write("video-sitemap-1.xml", format!("{}<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:video=\"http://www.google.com/schemas/sitemap-video/1.1\">\n{}</urlset>", xsl_header, xml_videos))?;

    fs::write("rss.xml", build_rss("Layar Kosong", &final_items[..final_items.len().min(RSS_LIMIT)], &format!("{}/rss.xml", BASE_URL), "Feed artikel terbaru"))?;

    if let Ok(tpl) = fs::read_to_string(TEMPLATE_KATEGORI) {
        for (cat, articles) in root_map {
            let slug = slugify(&cat);
            let rss_url = format!("{}/feed-{}.xml", BASE_URL, slug);
            let cat_articles: Vec<Article> = final_items.iter().filter(|it| it.category == cat).cloned().collect();
            let rss_cat = build_rss(&format!("Kategori {} - Layar Kosong", sanitize_title(&cat)), &cat_articles[..cat_articles.len().min(RSS_LIMIT)], &rss_url, &format!("Kumpulan artikel terbaru di kategori {}", cat));
            fs::write(format!("feed-{}.xml", slug), rss_cat)?;

            let has_part = articles.iter().map(|a| json!({
                "@type": "WebPage",
                "name": a.0,
                "url": format!("{}/{}/{}", BASE_URL, slug, a.1.replace(".html", "")),
                                                         "datePublished": a.3,
                                                         "description": if a.4.is_empty() { &a.0 } else { &a.4 }
            })).collect::<Vec<_>>();

            let schema_injection = format!(",\n  \"hasPart\": {}", serde_json::to_string_pretty(&has_part)?);
            let mut page_content = tpl
            .replace("%%TITLE%%", &sanitize_title(&cat))
            .replace("%%DESCRIPTION%%", &sanitize_title(&cat))
            .replace("%%CATEGORY_NAME%%", &cat)
            .replace("%%RSS_URL%%", &rss_url)
            .replace("%%CANONICAL_URL%%", &format!("{}/{}", BASE_URL, slug));

            page_content = page_content.replace("\"inLanguage\": \"id-ID\"", &format!("\"inLanguage\": \"id-ID\"{}", schema_injection));

            let out_dir = Path::new(".").join(&slug);
            fs::create_dir_all(&out_dir)?;
            fs::write(out_dir.join("index.html"), page_content)?;
        }
    }

    println!("✅ SELESAI! Semua Gate terlampaui, performa Rust optimal.");
    Ok(())
}

fn process_and_distribute(file: &str, category: &str, final_url: &str, preloaded_content: Option<&str>) -> Result<()> {
    let cat_slug = slugify(category);
    let dest_folder = Path::new(".").join(&cat_slug);
    fs::create_dir_all(&dest_folder)?;
    let mut content = match preloaded_content {
        Some(c) => c.to_string(),
        None => fs::read_to_string(Path::new(ARTIKEL_DIR).join(file))?,
    };

    // PAKAI INI (Lebih aman dan bersih):
    let canonical_tag = format!(r#"<link rel="canonical" href="{}">"#, final_url);
    content = RE_CANONICAL.replace_all(&content, canonical_tag.as_str()).to_string();

    let og_url_tag = format!(r#"<meta property="og:url" content="{}">"#, final_url);
    content = RE_OG_URL.replace_all(&content, og_url_tag.as_str()).to_string();


    let old_base = format!("{}/artikel/{}", BASE_URL, file.replace(".html", ""));
    content = content.replace(&old_base, final_url);
    let re_clean = Regex::new(r"\/artikel\/-\/([a-z-]+)(\.html)?\/?").unwrap();
    content = re_clean.replace_all(&content, "/$1").to_string();
    fs::write(dest_folder.join(file), content)?;
    Ok(())
}
