import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const inputFile = 'llms.txt';
const outputFile = 'sementara/daftar-judul.txt';

try {
  const content = readFileSync(inputFile, 'utf-8');
  
  // Regex untuk menangkap judul di dalam kurung siku setelah tanda '-'
  // Pola: - [Judul](link)
  const titleRegex = /^- \[(.*?)\]\(.*?\)/gm;
  
  let match;
  const titles: string[] = [];

  while ((match = titleRegex.exec(content)) !== null) {
    titles.push(match[1].trim());
  }

  // Pastikan folder 'sementara' ada
  mkdirSync(dirname(outputFile), { recursive: true });

  // Simpan ke file txt
  writeFileSync(outputFile, titles.join('\n'));

  console.log(`✅ Berhasil mengekstrak ${titles.length} judul ke ${outputFile}`);
} catch (err) {
  console.error('❌ Gagal memproses file:', err);
  process.exit(1);
}
