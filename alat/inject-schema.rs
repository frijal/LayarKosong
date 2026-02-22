use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use chrono::Local;
use regex::Regex;
use std::collections::HashMap;

// ======================================================
// KONFIGURASI GLOBAL
// ======================================================
const BASE_URL: &str = "https://dalam.web.id";
const SITE_NAME: &str = "Layar Kosong";
const AUTHOR: &str = "Fakhrul Rijal";
const LICENSE_URL: &str = "https://creativecommons.org/publicdomain/zero/1.0/";
const SIGNATURE_KEY: &str = "schema_oleh_Fakhrul_Rijal";

// Stopwords untuk keyword generator
static STOPWORDS: &[&str] = &["yang", "untuk", "dengan", "adalah", "dalam", "dari", "pada", "atau", "itu", "dan", "sebuah", "aku", "ke", "saya", "ini", "gue", "gua", "elu", "elo"];

// ======================================================
// UTILITIES
// ======================================================
fn slugify(text: &str) -> String {
    text.trim().to_lowercase().replace(" ", "-")
}

fn category_name_clean(category: &str) -> String {
    category.trim().replace("-", " ")
        .split_whitespace()
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn build_keywords(headline: &str, category: &str, slug: &str) -> String {
    let re = Regex::new(r"[^\w]+").unwrap();
    let words = re.split(headline.to_lowercase().as_str());

    let mut base: HashSet<String> = words
        .filter(|w| w.len() > 3 && !STOPWORDS.contains(w))
        .map(|w| w.to_string())
        .collect();

    base.insert(category.to_lowercase());

    for part in slug.replace("-", " ").split_whitespace() {
        if part.len() > 3 {
            base.insert(part.to_string());
        }
    }
    base.insert("layar kosong".to_string());

    let mut sorted_keys: Vec<_> = base.into_iter().collect();
    sorted_keys.sort();
    sorted_keys.truncate(12);
    sorted_keys.join(", ")
}

// ======================================================
// SCHEMA BUILDER
// ======================================================
fn build_combined_schema(category: &str, article: &[String]) -> String {
    let headline = &article[0];
    let filename = &article[1];
    let image = &article[2];
    let iso_date = &article[3];
    let desc = &article[4];

    let cat_slug = slugify(category);
    let file_slug = filename.replace(".html", "").trim_start_matches('/').to_string();

    let clean_base = BASE_URL.trim_end_matches('/');
    let article_url = format!("{}/{}/{}", clean_base, cat_slug, file_slug);
    let category_url = format!("{}/{}", clean_base, cat_slug);

    let cat_display_name = category_name_clean(category);
    let keywords = build_keywords(headline, &cat_display_name, &file_slug);

    let schema = json!({
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": format!("{}#website", clean_base),
                "url": clean_base,
                "name": SITE_NAME,
                "publisher": {
                    "@type": "Organization",
                    "@id": format!("{}#organization", clean_base),
                    "name": SITE_NAME,
                    "url": clean_base,
                    "logo": {
                        "@type": "ImageObject",
                        "url": format!("{}/logo.png", clean_base),
                        "width": 384,
                        "height": 384
                    }
                }
            },
            {
                "@type": "Article",
                "@id": format!("{}#article", article_url),
                "isPartOf": { "@id": format!("{}#website", clean_base) },
                "mainEntityOfPage": { "@type": "WebPage", "@id": article_url },
                "license": LICENSE_URL,
                "headline": headline,
                "description": desc,
                "articleSection": cat_display_name,
                "keywords": keywords,
                "image": { "@type": "ImageObject", "url": image, "width": 1200, "height": 675 },
                "author": { "@type": "Person", "name": AUTHOR, "url": format!("{}/about", clean_base) },
                "publisher": { "@id": format!("{}#organization", clean_base) },
                "datePublished": iso_date,
                "dateModified": iso_date
            },
            {
                "@type": "BreadcrumbList",
                "@id": format!("{}#breadcrumb", article_url),
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Beranda", "item": clean_base },
                    { "@type": "ListItem", "position": 2, "name": cat_display_name, "item": category_url },
                    { "@type": "ListItem", "position": 3, "name": headline, "item": article_url }
                ]
            }
        ]
    });

    format!("<script type=\"application/ld+json\">{}</script>\n", serde_json::to_string(&schema).unwrap())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let allowed_categories: HashSet<&str> = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"].iter().cloned().collect();

    let data_str = fs::read_to_string("artikel.json")?;
    let data: HashMap<String, Vec<Vec<String>>> = serde_json::from_str(&data_str)?;

    let mut changed = 0;
    let mut skipped = 0;
    let mut missing = 0;

    let tgl = Local::now().format("%Y-%m-%d").to_string();
    let signature = format!("<noscript>{}_{}</noscript>", SIGNATURE_KEY, tgl);
    let re_schema = Regex::new(r"(?is)<script\s+type=[\x22\x27]application/ld\+json[\x22\x27]>.*?</script>").unwrap();

    for (category, articles) in data {
        let cat_slug = slugify(&category);
        if !allowed_categories.contains(cat_slug.as_str()) { continue; }

        for article in articles {
            let filename = &article[1];
            let html_path = Path::new(&cat_slug).join(filename.trim_start_matches('/'));

            if !html_path.exists() {
                missing += 1;
                continue;
            }

            let mut html_content = fs::read_to_string(&html_path)?;

            if html_content.contains(SIGNATURE_KEY) {
                skipped += 1;
                continue;
            }

            println!("🧠 Injecting Schema: {:?}", html_path);

            // 1. Bersihkan schema lama
            html_content = re_schema.replace_all(&html_content, "").to_string();

            // 2. Build schema baru
            let inject_code = build_combined_schema(&category, &article);

            // 3. Sisipkan ke Head
            let mut new_html = if html_content.contains("<style>") {
                html_content.replace("<style>", &format!("{}<style>", inject_code))
            } else if html_content.contains("</head>") {
                html_content.replace("</head>", &format!("{}</head>", inject_code))
            } else {
                format!("{}{}", inject_code, html_content)
            };

            // 4. Tambahkan signature
            new_html = format!("{}\n{}", new_html.trim(), signature);

            fs::write(&html_path, new_html)?;
            changed += 1;
        }
    }

    println!("✅ SEO Schema Injector Selesai");
    println!("🆕 Di-inject: {}, ⏭️ Skipped: {}, ❌ Missing: {}", changed, skipped, missing);

    Ok(())
}
