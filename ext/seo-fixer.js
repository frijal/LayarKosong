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

    if ($('html').length === 0) continue; 

    // --- FITUR 1: AUTO-DEFER SCRIPT ---
    $('script[src]').each((i, el) => {
      const isAsync = $(el).attr('async') !== undefined;
      const isDefer = $(el).attr('defer') !== undefined;

      // Jika tidak ada async DAN tidak ada defer, tambahkan defer
      if (!isAsync && !isDefer) {
        $(el).attr('defer', ''); // Menghasilkan defer="" yang aman secara struktur
        changed = true;
        console.log(`⚡ Auto-Defer script di ${file}: ${$(el).attr('src')}`);
      }
    });

    // --- FITUR 2: AUTO-IMAGE-ALT ---
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

    // --- FITUR 3: STRUKTUR DASAR & META ---
    if (!$('meta[charset]').length) {
      $('head').prepend('<meta charset="UTF-8">');
      changed = true;
    }
    if (!$('html').attr('lang')) {
      $('html').attr('lang', 'id');
      changed = true;
    }

    const checkAndAddMeta = (selector, tag) => {
      if ($(selector).length === 0) {
        $('head').append(tag);
        changed = true;
      }
    };

    checkAndAddMeta('meta[name="description"]', `<meta name="description" content="Baca artikel terbaru di Layar Kosong: ${title}">`);
    checkAndAddMeta('meta[property="og:title"]', `<meta property="og:title" content="${title}">`);
    checkAndAddMeta('link[rel="canonical"]', `<link rel="canonical" href="https://dalam.web.id/${file}">`);

    // --- FITUR 4: HEADING OPTIMIZATION ---
    const h1 = $('h1');
    if (h1.length === 0) {
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
      // Simpan dengan format yang rapi
      fs.writeFileSync(file, $.html(), 'utf8');
      console.log(`✅ Berhasil dioptimasi: ${file}`);
    }
  }
}

fixSEO().catch(err => {
  console.error("❌ Error running SEO Fixer:", err);
  process.exit(1);
});
