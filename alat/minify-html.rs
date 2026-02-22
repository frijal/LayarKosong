use minify_html::minify;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use chrono::Local;
use rayon::prelude::*;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

// ======================================================
// KONFIGURASI
// ======================================================
const FOLDERS: &[&str] = &[
    "./gaya-hidup", "./jejak-sejarah", "./lainnya",
"./olah-media", "./opini-sosial", "./sistem-terbuka", "./warta-tekno"
];

const SIGNATURE_KEY: &str = "udah_dijepit_oleh_Fakhrul_Rijal";

struct Stats {
    success: AtomicUsize,
    skipped: AtomicUsize,
    failed: AtomicUsize,
    total_before: AtomicUsize,
    total_after: AtomicUsize,
}

fn format_bytes(bytes: usize) -> String {
    if bytes == 0 { return "0 B".to_string(); }
    let k = 1024.0;
    let sizes = ["B", "KB", "MB"];
    let i = (bytes as f64).log(k).floor() as usize;
    format!("{:.2} {}", (bytes as f64) / k.powi(i as i32), sizes[i])
}

fn minify_file(path: PathBuf, stats: &Stats, errors: &Mutex<Vec<String>>) {
    let file_name = path.file_name().unwrap().to_string_lossy();
    // Abaikan index.html dan file non-html
    if !file_name.ends_with(".html") || file_name == "index.html" {
        return;
    }

    match fs::read_to_string(&path) {
        Ok(mut html) => {
            if html.trim().is_empty() { return; }
            if html.contains(SIGNATURE_KEY) {
                stats.skipped.fetch_add(1, Ordering::SeqCst);
                return;
            }

            let size_before = html.len();

            // --- REPAIR REGEX ---
            // Rust Regex tidak support (?!), jadi kita pakai pendekatan yang lebih aman
            let re_script = Regex::new(r"(?is)<script[^>]*>(.*?)</script>").unwrap();
            // Regex ini menghapus line comment yang diawali // tapi mengabaikan yang ada di dalam URL (http://)
            let re_comment = Regex::new(r"(?m)^[ \t]*//.*$").unwrap();

            html = re_script.replace_all(&html, |caps: &regex::Captures| {
                let content = &caps[1];
                let cleaned_content = re_comment.replace_all(content, "");
                caps[0].replace(content, &cleaned_content)
            }).to_string();

            // --- CONFIG MINIFY (Versi Terbaru) ---
            let mut cfg = minify_html::Cfg::new();
            cfg.minify_doctype = true;
            cfg.allow_noncompliant_unquoted_attribute_values = true;
            cfg.allow_removing_spaces_between_attributes = true;
            cfg.keep_comments = false;
            cfg.minify_css = true;
            cfg.minify_js = true;

            let minified = minify(html.as_bytes(), &cfg);

            // --- SIGNATURE ---
            let tgl = Local::now().format("%Y-%m-%d").to_string();
            let signature = format!("<noscript>{}_{}</noscript>", SIGNATURE_KEY, tgl);

            // Gabungkan Vec<u8> dengan efisien
            let mut final_data = minified;
            final_data.extend_from_slice(signature.as_bytes());

            let size_after = final_data.len();

            if let Err(e) = fs::write(&path, final_data) {
                stats.failed.fetch_add(1, Ordering::SeqCst);
                errors.lock().unwrap().push(format!("{:?} -> {}", path, e));
            } else {
                let saved = if size_before > size_after { size_before - size_after } else { 0 };
                let percent = (saved as f64 / size_before as f64) * 100.0;

                println!("✅ [{:5.1}%] : {:?} ({} ➡️ {})",
                         percent,
                         path.file_name().unwrap(),
                         format_bytes(size_before),
                             format_bytes(size_after)
                );

                stats.success.fetch_add(1, Ordering::SeqCst);
                stats.total_before.fetch_add(size_before, Ordering::SeqCst);
                stats.total_after.fetch_add(size_after, Ordering::SeqCst);
            }
        },
        Err(e) => {
            stats.failed.fetch_add(1, Ordering::SeqCst);
            errors.lock().unwrap().push(format!("{:?} -> {}", path, e));
        }
    }
}

fn get_all_files(dir: &Path, files: &mut Vec<PathBuf>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                get_all_files(&path, files);
            } else {
                files.push(path);
            }
        }
    }
}

fn main() {
    println!("🧼 Memulai Minify Ultra (Rust Parallel Engine)...");
    println!("📂 Lokasi: Balikpapan | Status: Turbo On 🚀");

    let start_time = Instant::now();
    let stats = Stats {
        success: AtomicUsize::new(0),
        skipped: AtomicUsize::new(0),
        failed: AtomicUsize::new(0),
        total_before: AtomicUsize::new(0),
        total_after: AtomicUsize::new(0),
    };
    let error_list = Mutex::new(Vec::new());

    let mut all_files = Vec::new();
    for folder in FOLDERS {
        let p = Path::new(folder);
        if p.exists() {
            get_all_files(p, &mut all_files);
        }
    }

    if all_files.is_empty() {
        println!("⚠️  Tidak ada file ditemukan di folder target.");
        return;
    }

    // Eksekusi paralel dengan Rayon
    all_files.into_par_iter().for_each(|path| {
        minify_file(path, &stats, &error_list);
    });

    let duration = start_time.elapsed().as_secs_f64();
    let before = stats.total_before.load(Ordering::SeqCst);
    let after = stats.total_after.load(Ordering::SeqCst);
    let saved = if before > after { before - after } else { 0 };
    let percent = if before > 0 { (saved as f64 / before as f64) * 100.0 } else { 0.0 };

    println!("\n{}", "=".repeat(60));
    println!("📊 REKAP PROSES LAYAR KOSONG (RUST PARALLEL)");
    println!("{}", "=".repeat(60));
    println!("⏱️  Waktu Tempuh      : {:.2} detik", duration);
    println!("✅ Berhasil Dijepit  : {} file", stats.success.load(Ordering::SeqCst));
    println!("⏭️  Sudah Dijepit      : {} file", stats.skipped.load(Ordering::SeqCst));
    println!("❌ Gagal Proses      : {} file", stats.failed.load(Ordering::SeqCst));
    println!("{}", "-".repeat(60));
    println!("📉 Total Sebelum      : {}", format_bytes(before));
    println!("📉 Total Sesudah      : {}", format_bytes(after));
    println!("🚀 Ruang Dihemat      : {} ({:.2}%)", format_bytes(saved), percent);

    let errs = error_list.lock().unwrap();
    if !errs.is_empty() {
        println!("\n⚠️  DETAIL ERROR:");
        for (i, err) in errs.iter().enumerate() {
            println!("{}. {}", i + 1, err);
        }
    }
    println!("{}\n", "=".repeat(60));
}
