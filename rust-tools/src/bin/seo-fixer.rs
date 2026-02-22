use glob::glob;
use std::error::Error;
use std::path::Path;

fn main() -> Result<(), Box<dyn Error>> {
    // Kita gunakan path relatif yang naik satu tingkat ke root project
    // Lalu masuk ke folder 'artikel'
    let pattern = "../artikel/*.html";
    
    println!("========================================");
    println!("🚀 LAYAR KOSONG - SEO FIXER SCAFFOLDING");
    println!("========================================");
    println!("🔎 Mencari file HTML di: {}", pattern);

    let mut count = 0;

    // glob() akan mencari semua file .html
    for entry in glob(pattern)? {
        match entry {
            Ok(path) => {
                count += 1;
                
                // Ambil nama filenya saja biar log-nya rapi
                let file_name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown");

                println!("[{}] Menemukan file: {}", count, file_name);
                
                // Tes baca file untuk memastikan permission aman
                match std::fs::read_to_string(&path) {
                    Ok(content) => {
                        println!("   ✅ Akses baca OK ({} karakter)", content.len());
                    },
                    Err(e) => {
                        println!("   ❌ Gagal membaca file: {}", e);
                    }
                }
            },
            Err(e) => println!("❌ Error pada entri file: {:?}", e),
        }
    }

    println!("----------------------------------------");
    if count == 0 {
        println!("⚠️  Waduh, nggak ada file HTML yang ketemu.");
        println!("Tips: Pastikan folder 'artikel' ada di root project.");
    } else {
        println!("🎉 Selesai! Berhasil memproses {} file.", count);
    }
    println!("========================================");

    Ok(())
}
