import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..'); // Sesuaikan ke root folder blog kamu
const ARTIKEL_DIR = path.join(ROOT_DIR, 'artikel');

// Regex untuk mencari link (href atau src)
const LINK_REGEX = /(?:href|src)=["']([^"']+)["']/g;

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

console.log('🔍 Memulai audit link di file fisik secara rekursif...');
const allFiles = getFiles(ARTIKEL_DIR);
let brokenReport = '';

allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(ROOT_DIR, filePath);
  let match;
  
  while ((match = LINK_REGEX.exec(content)) !== null) {
    const link = match[1];
    
    // Filter: kita hanya cari link yang masih pakai .html (karena sudah migrasi ke Pretty URL)
    // Atau kamu bisa tambah logika pengecekan file fisik di sini
    if (link.endsWith('.html') && !link.startsWith('http')) {
      brokenReport += `[FILE]: ${relativePath} \n  -> [LINK RUSAK/LAMA]: ${link}\n\n`;
    }
  }
});

if (brokenReport) {
  fs.writeFileSync(path.join(ROOT_DIR, 'link-rusak.txt'), brokenReport);
  console.log('❌ Ditemukan link rusak! Detail disimpan di link-rusak.txt');
} else {
  fs.writeFileSync(path.join(ROOT_DIR, 'link-rusak.txt'), '✅ Semua link internal sudah bersih (Pretty URL).');
  console.log('✅ Tidak ada link .html yang ditemukan.');
}
