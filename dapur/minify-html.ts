import { minify } from '@minify-html/node';
import { Glob, file as bunFile, write, nanoseconds } from "bun";

// ========== TYPES ==========
interface ErrorDetail {
  path: string;
  error: string;
}

interface Stats {
  success: number;
  skipped: number;
  failed: number;
  errorList: ErrorDetail[];
  totalSaved: number;
  totalBefore: number;
  totalAfter: number;
}

// ========== CONFIG ==========
const folders: string[] = [
  'gaya-hidup', 'jejak-sejarah', 'lainnya', 'olah-media', 'opini-sosial', 'sistem-terbuka', 'warta-tekno'
];

let stats: Stats = {
  success: 0,
  skipped: 0,
  failed: 0,
  errorList: [],
  totalSaved: 0,
  totalBefore: 0,
  totalAfter: 0
};

// ========== UTILITIES ==========
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

async function processFile(filePath: string): Promise<void> {
  try {
    const f = bunFile(filePath);
    let html = await f.text();

    if (!html.trim() || html.includes('udah_dijepit_oleh_Fakhrul_Rijal')) {
      stats.skipped++;
      return;
    }

    if (filePath === 'index.html') {
      stats.skipped++;
      return;
    }

    const sizeBefore = Buffer.byteLength(html, 'utf8');

    // ========== TAHAP 1: PROTEKSI & SOFT-MINIFY SCRIPT INLINE ==========
    const scriptPlaceholders: string[] = [];

    // Regex ini akan mengabaikan script yang punya src ATAU type="application/ld+json"
    html = html.replace(/<script(?![^>]*\bsrc\b)(?![^>]*\btype=['"]?application\/ld\+json['"]?)[^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
      const softMinified = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/([^\\:]|^)\/\/.*/g, '$1')
      .replace(/^\s+|\s+$/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

      const id = `__SCRIPT_SOFT_${scriptPlaceholders.length}__`;
      // Kita simpan seluruh tag pembuka 'match' agar atribut selain src/type tetap terjaga
      // Tapi karena kita ingin soft-minify, kita rakit ulang:
      scriptPlaceholders.push(`<script>${softMinified}</script>`);
      return id;
    });

    // ========== TAHAP 2: PROSES MINIFY HTML UTAMA ==========
    const tgl = new Date().toISOString().slice(0, 10);
    const minifySignature = `<noscript>udah_dijepit_oleh_Fakhrul_Rijal_${tgl}</noscript>`;

    const output = minify(Buffer.from(html), {
      allow_noncompliant_unquoted_attribute_values: true, // Set ke false agar lebih standar
      allow_optimal_entities: true,
      allow_removing_spaces_between_attributes: true,
      collapse_whitespaces: true,
      ensure_spec_compliant_unquoted_attribute_values: true, // WAJIB TRUE agar kutip aman
      keep_comments: false,
      keep_html_and_head_opening_tags: true,
      keep_spaces_between_attributes: false,
      minify_css: true,
      minify_doctype: true,
      minify_js: true,
      remove_processing_instructions: true,
      remove_bangs: false, // Tetap false agar <!DOCTYPE html> tidak rusak
    });

    let minifiedHTML = output.toString();

    // ========== TAHAP 3: KEMBALIKAN SCRIPT YANG SUDAH RAMPING ==========
    scriptPlaceholders.forEach((tag, index) => {
      const id = `__SCRIPT_SOFT_${index}__`;
      minifiedHTML = minifiedHTML.replace(id, tag);
    });

    minifiedHTML += minifySignature;

    const sizeAfter = Buffer.byteLength(minifiedHTML, 'utf8');
    const saved = sizeBefore - sizeAfter;

    await write(filePath, minifiedHTML);

    stats.success++;
    stats.totalBefore += sizeBefore;
    stats.totalAfter += sizeAfter;
    stats.totalSaved += saved;

    const savingPercent = ((saved / sizeBefore) * 100).toFixed(1);
    console.log(`✅ [${savingPercent}%] : ${filePath} (${formatBytes(sizeBefore)} ➡️  ${formatBytes(sizeAfter)})`);

  } catch (err: any) {
    stats.failed++;
    stats.errorList.push({ path: filePath, error: err.message });
    console.error(`❌ Gagal jepit: ${filePath} -> ${err.message}`);
  }
}

async function run(): Promise<void> {
  console.log('🧼 Memulai Minify Ultra (Bun Native Mode)...');
  console.log('📂 Lokasi: Balikpapan | Status: Turbo Bun 🚀');

  const startTime = nanoseconds();
  const tasks: Promise<void>[] = [];

  // 1. Masukkan feed.html secara manual jika ada di root
  const feedFile = bunFile("feed.html");
  if (await feedFile.exists()) {
    tasks.push(processFile("feed.html"));
  }

  // 2. Scan folder kategori (termasuk index.html di dalamnya)
  for (const folder of folders) {
    const glob = new Glob(`${folder}/**/*.html`);
    for (const file of glob.scanSync(".")) {
      tasks.push(processFile(file));
    }
  }

  await Promise.all(tasks);

  const endTime = nanoseconds();
  const duration = (endTime - startTime) / 1e9;
  const totalSavingPercent = stats.totalBefore > 0
  ? ((stats.totalSaved / stats.totalBefore) * 100).toFixed(2)
  : "0";

  console.log('\n' + '='.repeat(60));
  console.log('📊 REKAP PROSES LAYAR KOSONG (BUN NATIVE)');
  console.log('='.repeat(60));
  console.log(`⏱️  Waktu Tempuh      : ${duration.toFixed(4)} detik`);
  console.log(`✅ Berhasil Dijepit  : ${stats.success} file`);
  console.log(`⏭️  Sudah Dijepit      : ${stats.skipped} file`);
  console.log(`❌ Gagal Proses       : ${stats.failed} file`);
  console.log('-'.repeat(60));
  console.log(`📉 Total Sebelum      : ${formatBytes(stats.totalBefore)}`);
  console.log(`📉 Total Sesudah      : ${formatBytes(stats.totalAfter)}`);
  console.log(`🚀 Ruang Dihemat      : ${formatBytes(stats.totalSaved)} (${totalSavingPercent}%)`);

  if (stats.failed > 0) {
    console.log('\n⚠️  DETAIL ERROR:');
    stats.errorList.forEach((item, i) => console.log(`${i+1}. ${item.path} -> ${item.error}`));
  }
  console.log('='.repeat(60) + '\n');
}

run();
