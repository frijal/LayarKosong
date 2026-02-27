/**
 * LAYAR KOSONG - ENVIRONMENT HEALTH CHECK
 * Lokasi: Balikpapan | Engine: Bun Turbo 🚀
 */

const packages = [
  { name: 'wrangler', module: 'wrangler' },
  { name: 'minify-html', module: '@minify-html/node' },
  { name: 'octokit', module: '@octokit/core' },
  { name: 'xmldom', module: '@xmldom/xmldom' },
  { name: 'cheerio', module: 'cheerio' },
  { name: 'fast-xml-parser', module: 'fast-xml-parser' },
  { name: 'sharp', module: 'sharp' },
  { name: 'tumblr', module: 'tumblr.js' }
];

async function runCheck() {
  console.log("🔍 Memulai pengecekan paket di environment Bun...\n");
  let allGood = true;

  for (const pkg of packages) {
    try {
      const start = performance.now();
      const mod = await import(pkg.module);
      const end = performance.now();
      
      console.log(`✅ ${pkg.name.padEnd(15)} : Terdeteksi (${(end - start).toFixed(2)}ms)`);
      
      // Test fungsi spesifik untuk paket yang rawan error binary
if (pkg.name === 'sharp') {
        // Cek versi sharp untuk memastikan binary bisa dipanggil tanpa error buffer
        const version = mod.default.versions;
        if (version) {
          console.log(`   └─ Sharp Binary: OK (v${mod.default.version})`);
        }
      }      
      if (pkg.name === 'cheerio') {
        const $ = mod.load('<html></html>');
        if ($) console.log(`   └─ Cheerio DOM: OK`);
      }

    } catch (err) {
      console.error(`❌ ${pkg.name.padEnd(15)} : GAGAL LOAD!`);
      console.error(`   └─ Error: ${err.message}`);
      allGood = false;
    }
  }

  console.log("\n" + "=".repeat(40));
  if (allGood) {
    console.log("🚀 SEMUA SISTEM SIAP! Layar Kosong siap tempur.");
  } else {
    console.log("⚠️ ADA MASALAH! Coba jalankan 'bun install' lagi.");
  }
  console.log("=".repeat(40));
}

runCheck();
