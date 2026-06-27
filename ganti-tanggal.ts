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
  // 💡 Path untuk file log kegagalan
  const logPath = path.join(process.cwd(), 'laporan-gagal.txt'); 

  try {
    const rawData = await fs.readFile(jsonPath, 'utf-8');
    const parsedData = JSON.parse(rawData);

    const daftarArtikel: ArtikelData[] = Object.values(parsedData).flat() as ArtikelData[];

    if (daftarArtikel.length === 0) {
        console.log("❌ Waduh, datanya kok kosong?");
        return;
    }

    console.log(`🚀 Bismillah.. Memproses ${daftarArtikel.length} artikel dari semua kategori...\n`);

    let sukses = 0;
    let skip = 0;
    let error = 0;
    
    // 💡 Penampung daftar file yang bermasalah (nggak ada meta atau gagal dibaca)
    const daftarGagal: string[] = [];

    for (const artikel of daftarArtikel) {
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

          if (tanggalLama !== tanggalKebenaran) {
            $metaTag.attr('content', tanggalKebenaran);
            await fs.writeFile(filePath, $.html(), 'utf-8');
            
            console.log(`✅ [UPDATED] ${fileName}`);
            console.log(`   Lama: ${tanggalLama} -> Baru: ${tanggalKebenaran}`);
            sukses++;
          } else {
            // Tanggal sudah sama, lewati. (Ini kategori aman, tidak masuk log gagal)
            skip++;
          }
        } else {
          const pesanGagal = `⚠️ [NO META] Meta tag tidak ditemukan di ${fileName}`;
          console.log(pesanGagal);
          daftarGagal.push(pesanGagal); // Masukkan ke catatan
          skip++;
        }
      } catch (fileErr: any) {
        let pesanError = '';
        if (fileErr.code === 'ENOENT') {
          pesanError = `❌ [NOT FOUND] File ${fileName} nggak ada di folder artikel/`;
        } else {
          pesanError = `❌ [ERROR] Gagal membaca ${fileName}: ${fileErr.message}`;
        }
        console.log(pesanError);
        daftarGagal.push(pesanError); // Masukkan ke catatan
        error++;
      }
    }
    
    console.log('\n🎉 Selesai, Mas Frijal! Eksekusi mantap jiwa.');
    console.log(`📊 Statistik Akhir: ${sukses} file diperbarui, ${skip} file dilewati (tanggal sama/tak ada meta), ${error} error.`);

    // 💡 Menulis file log .txt jika ada yang gagal
    if (daftarGagal.length > 0) {
        const waktuEksekusi = new Date().toLocaleString('id-ID');
        const isiLog = `Laporan Gagal Sinkronisasi Tanggal HTML\nWaktu Eksekusi: ${waktuEksekusi}\nTotal File Bermasalah: ${daftarGagal.length}\n\nRincian:\n` + daftarGagal.join('\n');
        
        await fs.writeFile(logPath, isiLog, 'utf-8');
        console.log(`📝 Catatan rincian yang gagal sudah disimpan di: laporan-gagal.txt`);
    } else {
        console.log(`✨ Alhamdulillah, mulus lus! Nggak ada file bermasalah, jadi nggak perlu bikin file log.`);
    }

  } catch (err) {
    console.error('❌ Gagal membaca atau mem-parse artikel.json:', err);
  }
}

sinkronisasiTanggal();
