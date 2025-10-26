// scan-stylesheet.js
import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve('./');
const OUTPUT_FILE = path.resolve('./stylesheet.txt');

let outputLines = [];

function scanFolder(folder) {
  const entries = fs.readdirSync(folder, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      scanFolder(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      const regex = /stylesheet/i;
      const matches = lines
        .map((line, idx) => ({ line, idx }))
        .filter(obj => regex.test(obj.line));

      if (matches.length > 0) {
        outputLines.push(`File: ${fullPath}`);
        outputLines.push(`Jumlah kemunculan: ${matches.length}`);
        matches.forEach(m => {
          outputLines.push(`Baris ${m.idx + 1}: ${m.line.trim()}`);
        });
        outputLines.push(''); // kosongkan antar file
      }
    }
  }
}

// Jalankan scan
scanFolder(ROOT_DIR);

// Simpan hasil ke file
fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n'), 'utf-8');

console.log(`Scan selesai. Hasil tersimpan di ${OUTPUT_FILE}`);
