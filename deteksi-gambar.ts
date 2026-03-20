import { glob } from 'glob';
import { load } from 'cheerio';
import { readFile } from 'node:fs/promises';

const SOURCE_DIR = 'artikel';

async function detectImageBlocks() {
  const files = await glob(`${SOURCE_DIR}/*.html`);
  const blocks = new Set<string>();

  for (const file of files) {
    const html = await readFile(file, 'utf-8');
    const $ = load(html);

    // Cari semua elemen yang mengandung <img> di dalamnya
    $('img').each((_, el) => {
      const parent = $(el).parent()[0].tagName;
      const grandParent = $(el).parent().parent()[0]?.tagName || 'none';
      const className = $(el).parent().attr('class') || '';
      
      blocks.add(`${parent}${className ? '.' + className : ''} > img`);
    });
  }

  console.log("🔍 Blok gambar yang terdeteksi di repo kamu:");
  blocks.forEach(b => console.log(`   - ${b}`));
}

detectImageBlocks();
