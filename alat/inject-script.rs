use std::fs;
use std::path::Path;
use std::env;

const CSS_RSS: &str = r#"<link rel="stylesheet" href="/ext/marquee-url.css">
<link rel="alternate" type="application/rss+xml" title="30 artikel baru bikin." href="https://dalam.web.id/rss.xml">"#;

const IPOS_CONTAINER: &str = r#"<div id="iposbrowser"></div>"#;

const BODY_ELEMENTS: &str = r#"<div id="progress"></div>
<a id="layar-kosong-header" href="https://dalam.web.id/"></a>
<div class="search-floating-container">
    <input type="text" id="floatingSearchInput" placeholder="cari artikel..." autocomplete="off">
    <span id="floatingSearchClear" class="clear-button"></span>
    <div id="floatingSearchResults" class="floating-results-container"></div>
</div>
<div id="dynamic-nav-container" class="floating-nav"></div>
<div id="internal-nav"></div>
<section id="related-marquee-section"><div id="related-marquee-container"></div></section>
<script defer src="/ext/markdown.js"></script>
<script defer src="/ext/marquee-url.js"></script>
<script defer src="/ext/pesbukdiskus.js"></script>
<script defer src="/ext/iposbrowser.js"></script>"#;

fn process_html_file(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut content = fs::read_to_string(path)?;
    let mut changed = false;

    // 1. Inject CSS & RSS sebelum </head>
    if !content.contains("marquee-url.css") && content.contains("</head>") {
        content = content.replace("</head>", &format!("{}\n</head>", CSS_RSS));
        changed = true;
    }

    // 2. Inject IPosBrowser setelah </h1>
    if !content.contains(r#"id="iposbrowser""#) && content.contains("</h1>") {
        content = content.replace("</h1>", &format!("</h1>\n{}", IPOS_CONTAINER));
        changed = true;
    }

    // 3. Inject Body Elements & Scripts sebelum </body>
    if !content.contains("search-floating-container") && content.contains("</body>") {
        content = content.replace("</body>", &format!("{}\n</body>", BODY_ELEMENTS));
        changed = true;
    }

    if changed {
        fs::write(path, content)?;
        println!("   ✅ Injected: {:?}", path.file_name().unwrap());
    }

    Ok(())
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Usage: inject-elements <folder_path>");
        return;
    }

    let target_dir = &args[1];
    println!("💉 Memulai Injeksi Elemen HTML di: {}", target_dir);

    if let Ok(entries) = fs::read_dir(target_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("html") {
                if let Err(e) = process_html_file(&path) {
                    println!("   ❌ Gagal memproses {:?}: {}", path, e);
                }
            }
        }
    }
    println!("✨ Selesai menyuntik elemen.");
}
