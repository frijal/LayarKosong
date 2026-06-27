import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

type ArtikelData = [
  string, // 0: Judul
  string, // 1: Nama file HTML
  string, // 2: URL Gambar
  string, // 3: Tanggal (Source of Truth)
  string  // 4: Deskripsi
];

async function sinkronisasiTanggal() {
  const jsonPath = path.join(process.cwd(), 'artikel.json');
  const htmlDir = path.join(process.cwd(), 'artikel');

  try {
    const rawData = await fs.readFile(jsonPath, 'utf-8');
    const parsedData = JSON.parse(rawData);

    // 💡 [MAGIC HAPPENS HERE]
    // Mengambil semua array dari dalam tiap kategori ("Jejak Sejarah", "Warta Tekno", dll)
    // lalu kita 'flat()' supaya melebur jadi 1 array 1-dimensi berisi data artikel.
    const daftarArtikel: ArtikelData[] = Object.values(parsedData).flat() as ArtikelData[];

    if (daftarArtikel.length === 0) {
        console.log("❌ Waduh, datanya kok kosong?");
        return;
    }

    console.log(`🚀 Bismillah.. Memproses ${daftarArtikel.length} artikel dari semua kategori...\n`);

    let sukses = 0;
    let skip = 0;
    let error = 0;

    for (const artikel of daftarArtikel) {
      // Validasi baris array
      if (!Array.isArray(artikel) || artikel.length < 4) continue;

      const fileName = artikel[1];
      const tanggalKebenaran = artikel[3];
      const filePath = path.join(htmlDir, fileName);

      try {
        const htmlContent = await fs.readFile(filePath, 'utf-8');
        const $ = cheerio.load(htmlContent, { xmlMode: false });
        const $metaTag = $('meta[property="article:published_time"]');

        if ($metaTag.length > 0) {
          const tanggalLama = $metaTag.attr('content');

          // Biar script-nya cerdas, dia cuma nulis (write) kalau tanggalnya beda
          if (tanggalLama !== tanggalKebenaran) {
            $metaTag.attr('content', tanggalKebenaran);
            await fs.writeFile(filePath, $.html(), 'utf-8');
            
            console.log(`✅ [UPDATED] ${fileName}`);
            console.log(`   Lama: ${tanggalLama} -> Baru: ${tanggalKebenaran}`);
            sukses++;
          } else {
            // Tanggal sudah sama, lewati saja
            skip++;
          }
        } else {
          console.log(`⚠️ [NO META] Meta tag tidak ditemukan di ${fileName}`);
          skip++;
        }
      } catch (fileErr: any) {
        if (fileErr.code === 'ENOENT') {
          console.log(`❌ [NOT FOUND] File ${fileName} nggak ada di folder artikel/`);
        } else {
          console.log(`❌ [ERROR] Gagal membaca ${fileName}: ${fileErr.message}`);
        }
        error++;
      }
    }
    
    console.log('\n🎉 Selesai, Mas Frijal! Eksekusi mantap jiwa.');
    console.log(`📊 Statistik Akhir: ${sukses} file diperbarui, ${skip} file dilewati (tanggal sama/tak ada meta), ${error} error.`);
  } catch (err) {
    console.error('❌ Gagal membaca atau mem-parse artikel.json:', err);
  }
}

sinkronisasiTanggal();
