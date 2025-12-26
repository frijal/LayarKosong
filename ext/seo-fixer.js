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

    // 1. Ambil Judul (Hanya deklarasi SEKALI di sini)
    const title = $('title').text() || 'Layar Kosong';

    // 2. Pastikan tag dasar ada
    if ($('html').length === 0) continue; 

    // --- FITUR AUTO-IMAGE-ALT ---
    $('img').each((i, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src');

      if (!alt || alt.trim() === "") {
        let newAlt = "";
        if (src) {
          const fileName = path.basename(src, path.extname(src));
          newAlt = fileName.replace(/[-_]/g, ' ');
        } else {
          newAlt = `Gambar untuk ${title}`;
        }
        $(el).attr('alt', `${newAlt} - ${title}`);
        changed = true;
        console.log(`📸 Fixed Alt Image di ${file}: ${newAlt}`);
      }
    });

    // --- STRUKTUR DASAR ---
    if (!$('meta[charset]').length) {
      $('head').prepend('<meta charset="UTF-8">');
      changed = true;
    }
    if (!$('html').attr('lang')) {
      $('html').attr('lang', 'id');
      changed = true;
    }

    // --- AUTO-FIX META TAGS ---
    const checkAndAddMeta = (selector, tag) => {
      if ($(selector).length === 0) {
        $('head').append(tag);
        changed = true;
      }
    };

    checkAndAddMeta('meta[name="description"]', `<meta name="description" content="Baca artikel terbaru di Layar Kosong: ${title}">`);
    checkAndAddMeta('meta[property="og:title"]', `<meta property="og:title" content="${title}">`);
    checkAndAddMeta('link[rel="canonical"]', `<link rel="canonical" href="https://dalam.web.id/${file}">`);

    // --- PERBAIKAN HEADING (H1) ---
    const h1 = $('h1');
    if (h1.length === 0) {
      // Masukkan ke <main> kalau ada, kalau tidak ada ke <body>
      const target = $('main').length ? $('main') : $('body');
      target.prepend(`<h1>${title}</h1>`);
      changed = true;
    } else if (h1.length > 1) {
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

fixSEO().catch(err => {
  console.error("❌ Error running SEO Fixer:", err);
  process.exit(1);
});
