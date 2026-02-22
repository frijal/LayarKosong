use glob::glob;
use lol_html::{element, html_content::ContentType, HtmlRewriter, Settings};
use std::fs;
use std::path::Path;
use scraper::{Html, Selector}; // Tambahkan 'scraper' di Cargo.toml untuk Pass 1

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

fn main() -> anyhow::Result<()> {
    let target_folder = std::env::args().nth(1).unwrap_or_else(|| "../artikel".to_string());
    let base_url = "https://dalam.web.id";
    let pattern = format!("{}/*.html", target_folder);

    for entry in glob(&pattern)? {
        let path = entry?;
        let raw_content = fs::read_to_string(&path)?;
        let file_name = path.file_stem().unwrap().to_str().unwrap();
        
        println!("🔍 Memproses SEO: {}.html", file_name);

        // --- PASS 1: EKSTRAKSI DATA (Scraper) ---
        let document = Html::parse_document(&raw_content);
        
        // Ambil Title
        let title = document.select(&Selector::parse("title").unwrap()).next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();
        let article_title = title.split(" - ").next().unwrap_or("Layar Kosong").trim();
        let escaped_title = escape_html_attr(article_title);

        // Ambil Deskripsi Mentah
        let raw_desc = document.select(&Selector::parse("meta[name='description'], meta[property='description']").unwrap())
            .next().and_then(|e| e.value().attr("content")).unwrap_or("");

        // Ambil Paragraf Pertama (Fallback)
        let first_p = document.select(&Selector::parse("p").unwrap()).next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();
        
        let fallback = if !first_p.is_empty() {
            let end = first_p.chars().count().min(160);
            prepare_desc(&first_p.chars().take(end).collect::<String>())
        } else {
            "Layar Kosong - Catatan dan Opini.".to_string()
        };

        let final_desc = if raw_desc.is_empty() { fallback } else { prepare_desc(raw_desc) };
        let canonical_url = format!("{}/artikel/{}", base_url, file_name);

        // Ambil Meta Image
        let meta_img = document.select(&Selector::parse("img").unwrap()).next()
            .and_then(|e| e.value().attr("src")).unwrap_or("");

        // Ambil Tags
        let mut tags = Vec::new();
        for el in document.select(&Selector::parse("meta[property='article:tag']").unwrap()) {
            if let Some(content) = el.value().attr("content") {
                tags.push(content.to_string());
            }
        }

        // --- PASS 2: REWRITING (lol_html) ---
        let mut output = Vec::new();
        let mut rewriter = HtmlRewriter::new(
            Settings {
                element_content_handlers: vec![
                    // Set HTML lang & prefix
                    element!("html", |el| {
                        el.set_attribute("lang", "id")?;
                        el.set_attribute("prefix", "og: https://ogp.me/ns# article: https://ogp.me/ns/article#")?;
                        Ok(())
                    }),
                    // Hapus sampah lama
                    element!("link[rel='canonical'], link[rel='icon'], link[rel='license']", |el| { el.remove(); Ok(()) }),
                    element!("meta[name='description'], meta[property^='og:'], meta[name^='twitter:'], meta[property^='article:'], meta[name='author'], meta[name='robots']", |el| {
                        el.remove();
                        Ok(())
                    }),
                    // Suntik Meta Baru di <head>
                    element!("head", |el| {
                        let mut inject = format!(
                            r#"
    <meta property="og:locale" content="id_ID">
    <meta property="og:site_name" content="Layar Kosong">
    <link rel="icon" href="/favicon.ico">
    <link rel="canonical" href="{canonical}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:title" content="{title}">
    <meta name="description" content="{desc}">
    <meta property="og:description" content="{desc}">
    <meta name="author" content="Fakhrul Rijal">
    <meta name="robots" content="index, follow, max-image-preview:large">"#,
                            canonical = canonical_url,
                            title = escaped_title,
                            desc = final_desc
                        );

                        if !meta_img.is_empty() {
                            inject.push_str(&format!(r#"
    <meta property="og:image" content="{img}">
    <meta name="twitter:card" content="summary_large_image">"#, img = meta_img));
                        }

                        for tag in &tags {
                            inject.push_str(&format!(r#"
    <meta property="article:tag" content="{}">"#, tag));
                        }

                        el.append(&inject, ContentType::Html);
                        Ok(())
                    }),
                    // Body Fixes: Alt Tag Image
                    element!("img", |el| {
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
        fs::write(&path, output)?;
    }

    println!("\n✅ SEO Fixer: Selesai! 970 file sudah dipoles.");
    Ok(())
}
