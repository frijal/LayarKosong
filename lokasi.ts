import { Glob } from "bun";

const targetPackages = [
  "puppeteer", "linkedom", "axios", "@atproto/api", 
  "node-html-parser", "p-limit", "twitter-api-v2"
];

const glob = new Glob("+(dapur|ext)/**/*.{ts,js}");

console.log(`🔍 Lagi nyari paket... sabar ya...\n`);

let found = false;

for await (const file of glob.scan()) {
  const content = await Bun.file(file).text();
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    targetPackages.forEach((pkg) => {
      if (line.includes(pkg)) {
        console.log(`📍 Ditemukan: ${pkg}`);
        console.log(`   File: ${file} (baris ${index + 1})`);
        console.log(`   Kode: ${line.trim()}\n`);
        found = true;
      }
    });
  });
}

if (!found) {
  console.log("❌ Nggak nemu paketnya! Coba cek apakah file lo beneran di folder 'dapur' atau 'ext'?");
}
