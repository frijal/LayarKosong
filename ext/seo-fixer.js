import fs from 'fs';
import { load } from 'cheerio';
import { glob } from 'glob';
import path from 'path';

async function fixSEO() {
  const files = await glob('artikel/*.html');

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const $ = load(content);
    let changed = false;
    const title = $('title').text() || 'Layar Kosong';
    
// --- FITUR AUTO-IMAGE-ALT ---
    $('img').each((i, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src');

      // Cek jika alt tidak ada, kosong, atau hanya berisi spasi
      if (!alt || alt.trim() === "") {
        let newAlt = "";
        
        if (src) {
          // Ambil nama file dari src, misal: "pemandangan-balikpapan.jpg" -> "pemandangan balikpapan"
          const fileName = path.basename(src, path.extname(src));
          newAlt = fileName.replace(/[-_]/g, ' ');
        } else {
          newAlt = `Gambar untuk ${title}`;
        }    

// Set alt text baru: "Nama File - Judul Artikel" agar SEO makin kuat
        $(el).attr('alt', `${newAlt} - ${title}`);
        changed = true;
        console.log(`📸 Fixed Alt Image di ${file}: ${newAlt}`);
      }
    });
    
    // 1. Pastikan tag dasar ada
    if ($('html').length === 0) continue; // Skip jika bukan file HTML lengkap

    // 2. Tambahkan meta charset & lang jika hilang
    if (!$('meta[charset]').length) {
      $('head').prepend('<meta charset="UTF-8">');
      changed = true;
    }
    if (!$('html').attr('lang')) {
      $('html').attr('lang', 'id');
      changed = true;
    }

    // 3. Auto-fix Meta Tags (Default Values)
    const title = $('title').text() || 'Layar Kosong Article';
    const checkAndAddMeta = (selector, tag) => {
      if ($(selector).length === 0) {
        $('head').append(tag);
        changed = true;
      }
    };

    checkAndAddMeta('meta[name="description"]', `<meta name="description" content="Baca artikel terbaru di Layar Kosong: ${title}">`);
    checkAndAddMeta('meta[property="og:title"]', `<meta property="og:title" content="${title}">`);
    checkAndAddMeta('link[rel="canonical"]', `<link rel="canonical" href="https://dalam.web.id/${file}">`);

    // 4. Perbaikan Heading (H1)
    const h1 = $('h1');
    if (h1.length === 0) {
      $('main').prepend(`<h1>${title}</h1>`);
      changed = true;
    } else if (h1.length > 1) {
      // Jika H1 lebih dari satu, ubah yang kedua dan seterusnya menjadi H2
      h1.each((i, el) => {
        if (i > 0) {
          el.tagName = 'h2';
          changed = true;
        }
      });
    }

    if (changed) {
      fs.writeFileSync(file, $.html(), 'utf8');
      console.log(`✅ Fixed: ${file}`);
    }
  }
}

fixSEO();
