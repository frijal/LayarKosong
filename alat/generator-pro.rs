use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rayon::prelude::*;
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, LazyLock, Mutex};

struct CategoryDefinition {
    name: &'static str,
    keywords: &'static [&'static str],
}

// Data kategori persis seperti di JS kamu
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
    keywords: &["adab", "akidah", "al-andalus", "andalusia", "aqidah", "ayub", "baghdad", "bahtera", "baitul-hikmah", "barqa", "bilal", "daulah", "doa", "fatih", "fatwa", "fiqh", "fitnah", "ghibah", "hadis", "haki", "halal", "haram", "hijab", "hijrah", "hijriyah", "hittin", "hukum", "ibnu batutah", "ikhlas", "imam", "iman", "islam", "istighfar", "isra", "janji", "jumat", "khalifah", "khwarizmi", "madinah", "madyan", "masjid", "masyitoh", "maulid", "mesir", "muamalah", "muhammadiyah", "mukjizat", "murad", "musa", "mushaf", "muslim", "nabi", "nuh", "pahlawan", "penaklukan", "perjanjian", "persia", "pertempuran", "piagam", "quran", "qunut", "ramadhan", "risalah", "sabar", "saf", "sahabat", "salam", "salman", "sejarah", "seljuk", "shalat", "shalahuddin", "sirah", "sombong", "sunnah", "surga", "syariat", "tabayun", "tabi'in", "tabut", "tauhid", "tawadhu", "uhud", "umar", "utsman", "utsmaniyah", "yaqub", "yarmuk", "yerusalem", "yusuf", "zaid"],
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
},
];
// ===================================================================
// KONFIGURASI TERPUSAT
// ===================================================================
const BASE_URL: &str = "https://dalam.web.id";
const ARTIKEL_DIR: &str = "./artikel";
const TEMPLATE_KATEGORI: &str = "./artikel/-/template-kategori.html";
const JSON_OUT: &str = "artikel.json";
const SITEMAP_TXT: &str = "sitemap.txt";
const RSS_LIMIT: usize = 30;

static VALID_CATEGORIES: &[&str] = &[
    "gaya-hidup", "jejak-sejarah", "lainnya", "olah-media",
"opini-sosial", "sistem-terbuka", "warta-tekno"
];

// ===================================================================
// REGEX ENGINE (Compiled Once)
// ===================================================================
static RE_TITLE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)<title>([\s\S]*?)</title>").unwrap());
static RE_DESC: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+name=["']description["'][^>]+content=["']([^"']+)["']"#).unwrap());
static RE_PUB_DATE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+property=["']article:published_time["'][^>]+content=["']([^"']+)["']"#).unwrap());
static RE_OG_IMAGE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+[^>]*(?:name|property)=["'](?:og|twitter):image["'][^>]*content=["']([^"']+)["']"#).unwrap());
static RE_IFRAME: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<iframe[^>]+src=["']([^"']+)["']"#).unwrap());
static RE_CANONICAL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*/?>"#).unwrap());
static RE_OG_URL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?i)<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*/?>"#).unwrap());

// ===================================================================
// DATA STRUCTURES
// ===================================================================
type ArticleTuple = (String, String, String, String, String); // [judul, file, img, tanggal, desc]

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
// HELPERS
// ===================================================================
fn slugify(text: &str) -> String {
    text.to_lowercase().trim()
    .replace(" & ", "-and-")
    .replace(|c: char| !c.is_alphanumeric() && c != ' ', "")
    .split_whitespace()
    .collect::<Vec<_>>()
    .join("-")
}

fn sanitize_title(raw: &str) -> String {
    // Sederhana: hapus emoji di awal jika ada (menggunakan regex jika perlu)
    raw.trim().to_string()
}

// Replikasi logic titleToCategory.js (Sesuaikan dengan file JS kamu)
fn title_to_category(title: &str) -> String {
    let t = title.to_lowercase();

    // Iterasi daftar CATEGORIES yang di atas tadi
    let found = CATEGORIES.iter().find(|cat| {
        // Cek apakah ada keyword yang terkandung dalam judul (t.contains(k))
        cat.keywords.iter().any(|&k| t.contains(k))
    });

    match found {
        Some(cat) => cat.name.to_string(),
        None => "Lainnya".to_string(),
    }
}

// ===================================================================
// CORE PROCESSOR
// ===================================================================
fn main() -> Result<()> {
    println!("🚀 Memulai Rust Generator V8.6 (Tiered Gateway)...");

    // 1. PREPARASI DATA
    let etalase_raw = fs::read_to_string(JSON_OUT).unwrap_or_else(|_| "{}".to_string());
    let etalase_data: HashMap<String, Vec<ArticleTuple>> = serde_json::from_str(&etalase_raw).unwrap_or_default();

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

    // 2. PEKERJAAN BERTINGKAT (PARALLEL)
    files_on_disk.par_iter().for_each(|path| {
        let file_name = path.file_name().unwrap().to_string_lossy().to_string();
        let mut article_info: Option<(ArticleTuple, String)> = None;

        // --- GATE 1: CEK ETALASE ---
        for (cat, items) in &etalase_data {
            if let Some(found) = items.iter().find(|it| it.1 == file_name) {
                let loc = format!("{}/{}/{}", BASE_URL, slugify(cat), file_name.replace(".html", ""));

                // --- GATE 2: CEK CACHE (sitemap.txt) ---
                if processed_urls.contains(&loc) {
                    article_info = Some((found.clone(), cat.clone()));
                    break;
                }
            }
        }

        // --- GATE 4: AUTO-DISCOVERY ---
        if article_info.is_none() {
            if let Ok(content) = fs::read_to_string(path) {
                let title = RE_TITLE.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()).unwrap_or_else(|| "Tanpa Judul".to_string());
                let category = title_to_category(&title);
                let loc = format!("{}/{}/{}", BASE_URL, slugify(&category), file_name.replace(".html", ""));

                let desc = RE_DESC.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string()).unwrap_or_default();
                let date = RE_PUB_DATE.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string())
                .unwrap_or_else(|| Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string());
                let img = RE_OG_IMAGE.captures(&content).and_then(|c| c.get(1)).map(|m| m.as_str().to_string())
                .unwrap_or_else(|| format!("{}/img/{}.webp", BASE_URL, file_name.replace(".html", "")));

                let new_data = (title.clone(), file_name.clone(), img, date, desc);

                // DISTRIBUSI FILE (Gate 3/4 Logic)
                let _ = process_and_distribute(&file_name, &category, &loc, &content);

                article_info = Some((new_data, category));
            }
        }

        // Simpan Hasil ke Koleksi Global
        if let Some((data, cat)) = article_info {
            let article = Article {
                title: data.0.clone(),
                                      file: data.1.clone(),
                                      img: data.2.clone(),
                                      lastmod: data.3.clone(),
                                      desc: data.4.clone(),
                                      category: cat.clone(),
                                      loc: format!("{}/{}/{}", BASE_URL, slugify(&cat), file_name.replace(".html", "")),
            };

            valid_files_cleaning.lock().unwrap().insert(format!("{}/{}", slugify(&cat), file_name));
            all_items_flat.lock().unwrap().push(article);
            final_root_data.lock().unwrap().entry(cat).or_default().push(data);
        }
    });

    // 3. SMART CLEANING
    for cat_slug in VALID_CATEGORIES {
        let folder_path = Path::new(".").join(cat_slug);
        if let Ok(entries) = fs::read_dir(&folder_path) {
            for entry in entries.filter_map(|e| e.ok()) {
                let fname = entry.file_name().to_string_lossy().to_string();
                if fname.ends_with(".html") && fname != "index.html" {
                    if !valid_files_cleaning.lock().unwrap().contains(&format!("{}/{}", cat_slug, fname)) {
                        println!("🗑️  Menghapus file usang: {}/{}", cat_slug, fname);
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        }
    }

    // 4. SORTING & SAVING
    let mut final_items = Arc::try_unwrap(all_items_flat).unwrap().into_inner().unwrap();
    final_items.sort_by(|a, b| b.lastmod.cmp(&a.lastmod));

    let mut root_map = Arc::try_unwrap(final_root_data).unwrap().into_inner().unwrap();
    for items in root_map.values_mut() {
        items.sort_by(|a, b| b.3.cmp(&a.3));
    }

    fs::write(JSON_OUT, serde_json::to_string_pretty(&root_map)?)?;
    fs::write(SITEMAP_TXT, final_items.iter().map(|it| it.loc.clone()).collect::<Vec<_>>().join("\n"))?;

    // 5. LANDING PAGE KATEGORI & RSS
    let template_html = fs::read_to_string(TEMPLATE_KATEGORI).ok();
    if let Some(tpl) = template_html {
        for (cat, articles) in root_map {
            let slug = slugify(&cat);
            let rss_url = format!("{}/feed-{}.xml", BASE_URL, slug);

            // Generate JSON-LD hasPart
            let has_part = articles.iter().map(|a| json!({
                "@type": "WebPage",
                "name": a.0,
                "url": format!("{}/{}/{}", BASE_URL, slug, a.1.replace(".html", "")),
                                                         "datePublished": a.3,
                                                         "description": if a.4.is_empty() { &a.0 } else { &a.4 }
            })).collect::<Vec<_>>();

            let schema_injection = format!(",\n  \"hasPart\": {}", serde_json::to_string_pretty(&has_part)?);

            let page_content = tpl
            .replace("%%TITLE%%", &sanitize_title(&cat))
            .replace("%%CATEGORY_NAME%%", &cat)
            .replace("%%RSS_URL%%", &rss_url)
            .replace("%%CANONICAL_URL%%", &format!("{}/{}", BASE_URL, slug))
            .replace(r#""inLanguage": "id-ID""#, &format!(r#""inLanguage": "id-ID"{}"#, schema_injection));

            let out_dir = Path::new(".").join(&slug);
            fs::create_dir_all(&out_dir)?;
            fs::write(out_dir.join("index.html"), page_content)?;
        }
    }

    println!("✅ SELESAI! Semua Gate terlampaui, performa optimal.");
    Ok(())
}

// ===================================================================
// DISTRIBUTION ENGINE
// ===================================================================
fn process_and_distribute(file: &str, category: &str, final_url: &str, content: &str) -> Result<()> {
    let cat_slug = slugify(category);
    let dest_folder = Path::new(".").join(&cat_slug);
    fs::create_dir_all(&dest_folder)?;

    let mut new_content = content.to_string();

    // Replikasi Regex Replace Canonical & OG
    new_content = RE_CANONICAL.replace(&new_content, |_: &Captures| {
        format!(r#"<link rel="canonical" href="{}">"#, final_url)
    }).to_string();

    new_content = RE_OG_URL.replace(&new_content, |_: &Captures| {
        format!(r#"<meta property="og:url" content="{}">"#, final_url)
    }).to_string();

    // Clean internal links
    let old_path = format!("{}/artikel/{}", BASE_URL, file.replace(".html", ""));
    new_content = new_content.replace(&old_path, final_url);

    // Replace artikel folder links (V8.6 logic)
    let re_folder = Regex::new(r#"/artikel/-/([a-z-]+)(\.html)?/?"#).unwrap();
    new_content = re_folder.replace_all(&new_content, "/$1").to_string();

    fs::write(dest_folder.join(file), new_content)?;
    Ok(())
}
