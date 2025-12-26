import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';

async function fixSEO() {
  const files = await glob('artikel/*.html');
  let totalErrors = 0;
  
  // Siapkan file laporan
  const tanggal = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const laporanPath = `mini/laporan-validasi-${tanggal}.txt`;
  
  if (!fs.existsSync('mini')) fs.mkdirSync('mini');
  
  let isiLaporan = `📋 LAPORAN AUDIT STRUKTUR & SEO (${new Date().toLocaleString()})\n`;
  isiLaporan += `============================================================\n\n`;

  console.log("🔍 Memulai audit dan perbaikan SEO...");

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    
    // --- LANGKAH 1: VALIDASI KESEIMBANGAN TAG & GITHUB ANNOTATIONS ---
    const tagsToWatch = ['section', 'div', 'article', 'main', 'header', 'footer'];
    let fileErrors = [];

    tagsToWatch.forEach(tag => {
      const openRegex = new RegExp(`<${tag}(\\s|>|$)`, 'gi');
      const closeRegex = new RegExp(`</${tag}>`, 'gi');
      const openCount = (rawContent.match(openRegex) || []).length;
      const closeCount = (rawContent.match(closeRegex) || []).length;

      if (openCount !== closeCount) {
        const msg = `Tag <${tag}> pincang! (Buka: ${openCount}, Tutup: ${closeCount})`;
        fileErrors.push(msg);
        
        // Mengirim komentar otomatis ke Pull Request GitHub
        console.log(`::error file=${file},line=1,title=Struktur HTML Rusak::${msg}`);
      }
    });

    if (fileErrors.length > 0) {
      const pesanError = `❌ STRUKTUR RUSAK: ${file}\n` + fileErrors.map(e => `   - ${e}`).join('\n') + '\n\n';
      console.error(pesanError);
      isiLaporan += pesanError;
      totalErrors++;
      continue; // Skip file agar tidak dirusak auto-cleanup Cheerio
    }

    // --- LANGKAH 2: PROSES DENGAN CHEERIO (Jika Tag Sudah Aman) ---
    const $ = load(rawContent, { decodeEntities: false });
    let changed = false;
    const title = $('title').text() || 'Layar Kosong';

    if ($('html').length === 0) continue; 

    // Auto-Defer Script
    $('script[src]').each((i, el) => {
      if ($(el).attr('async') === undefined && $(el).attr('defer') === undefined) {
        $(el).attr('defer', '');
        changed = true;
      }
    });

    // Auto-Image-Alt (Optimasi SEO Gambar)
    $('img').each((i, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src');
      if (!alt || alt.trim() === "") {
        const fileName = src ? path.basename(src, path.extname(src)).replace(/[-_]/g, ' ') : 'Gambar';
        $(el).attr('alt', `${fileName} - ${title}`);
        changed = true;
      }
    });

    // SEO Meta & Canonical
    if (!$('meta[charset]').length) { $('head').prepend('<meta charset="UTF-8">'); changed = true; }
    if (!$('html').attr('lang')) { $('html').attr('lang', 'id'); changed = true; }

    const checkAndAddMeta = (selector, tag) => {
      if ($(selector).length === 0) { $('head').append(tag); changed = true; }
    };

    checkAndAddMeta('meta[name="description"]', `<meta name="description" content="Baca artikel terbaru di Layar Kosong: ${title}">`);
    checkAndAddMeta('meta[property="og:title"]', `<meta property="og:title" content="${title}">`);
    checkAndAddMeta('link[rel="canonical"]', `<link rel="canonical" href="https://dalam.web.id/${file}">`);

    // Heading Fix (Mencegah Multiple H1)
    const h1 = $('h1');
    if (h1.length === 0) {
      ($('main').length ? $('main') : $('body')).prepend(`<h1>${title}</h1>`);
      changed = true;
    } else if (h1.length > 1) {
      h1.each((i, el) => { if (i > 0) { el.tagName = 'h2'; changed = true; } });
    }

    if (changed) {
      fs.writeFileSync(file, $.html(), 'utf8');
      console.log(`✅ Berhasil dioptimasi: ${file}`);
      isiLaporan += `✅ FIXED: ${file} (SEO & Struktur dioptimasi)\n\n`;
    }
  }

  // Tulis laporan final
  fs.writeFileSync(laporanPath, isiLaporan, 'utf8');

  // --- LANGKAH 3: KEPUTUSAN AKHIR ---
  if (totalErrors > 0) {
    console.error(`\nAudit selesai dengan ${totalErrors} kesalahan. Silakan cek komentar di Pull Request.`);
    process.exit(1); 
  } else {
    console.log(`\nAudit sukses! Laporan tersimpan di ${laporanPath}`);
  }
}

fixSEO().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
