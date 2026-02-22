use minify_html::{minify, Cfg};
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use chrono::Local;
use rayon::prelude::*; // Supaya prosesnya paralel beneran
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

// Helper format bytes
fn format_bytes(bytes: usize) -> String {
    if bytes == 0 { return "0 B".to_string(); }
    let k = 1024.0;
    let sizes = ["B", "KB", "MB"];
    let i = (bytes as f64).log(k).floor() as usize;
    format!("{:.2} {}", (bytes as f64) / k.powi(i as i32), sizes[i])
}

fn minify_file(path: PathBuf, stats: &Stats, errors: &Mutex<Vec<String>>) {
    let file_name = path.file_name().unwrap().to_string_lossy();
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

            // --- PERBAIKAN KOMENTAR JS (RegEx ala Rust) ---
            let re_script = Regex::new(r"(?gi)<script[\s\S]*?>(?P<content>[\s\S]*?)</script>").unwrap();
            let re_comment = Regex::new(r"(?m)^[ \t]*//(?!#).*").unwrap();

            // Kita proses script tags untuk hapus comment //
            html = re_script.replace_all(&html, |caps: &regex::Captures| {
                let content = &caps["content"];
                let cleaned_content = re_comment.replace_all(content, "");
                caps[0].replace(content, &cleaned_content)
            }).to_string();

            // Setup Minify Config (Sama dengan config Node kamu)
            let mut cfg = Cfg::new();
            cfg.do_not_minify_doctype = false;
            cfg.ensure_spec_compliant_unquoted_attribute_values = false;
            cfg.keep_comments = false;
            cfg.minify_css = true;
            cfg.minify_js = true;
            cfg.remove_processing_instructions = true;
            cfg.collapse_whitespaces = true;

            let minified = minify(html.as_bytes(), &cfg);

            // Signature
            let tgl = Local::now().format("%Y-%m-%d").to_string();
            let signature = format!("<noscript>{}_{}</noscript>", SIGNATURE_KEY, tgl);

            let mut final_html = minified;
            final_html.extend_from_slice(signature.as_bytes());

            let size_after = final_html.len();

            if let Err(e) = fs::write(&path, final_html) {
                stats.failed.fetch_add(1, Ordering::SeqCst);
                errors.lock().unwrap().push(format!("{:?} -> {}", path, e));
            } else {
                let saved = if size_before > size_after { size_before - size_after } else { 0 };
                let percent = (saved as f64 / size_before as f64) * 100.0;

                println!("✅ [{:.1}%] : {:?} ({} ➡️ {})", percent, path.file_name().unwrap(), format_bytes(size_before), format_bytes(size_after));

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

// Fungsi rekursif untuk ambil semua path file
fn get_all_files(dir: &Path, files: &mut Vec<PathBuf>) {
    if dir.is_dir() {
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

    // 1. Kumpulkan semua file dulu
    let mut all_files = Vec::new();
    for folder in FOLDERS {
        get_all_files(Path::new(folder), &mut all_files);
    }

    // 2. Proses secara paralel menggunakan Rayon (Mirip Promise.all tapi thread-based)
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
