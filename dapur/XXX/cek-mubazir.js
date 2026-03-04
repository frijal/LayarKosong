import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __scriptName = path.basename(__filename);

// Tambahkan .yml dan .yaml untuk mendeteksi penggunaan di CI/CD workflows
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out']; 
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.html', '.yml', '.yaml']; 

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

const usageDetails = new Map();
allDeps.forEach(dep => usageDetails.set(dep, []));

function scanFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) scanFiles(fullPath);
      continue;
    }

    const ext = path.extname(file);
    if (EXTENSIONS.includes(ext) && file !== __scriptName) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      allDeps.forEach(dep => {
        // Regex yang lebih fleksibel:
        // 1. Mencari dalam tanda kutip (import/require)
        // 2. Mencari sebagai kata utuh (perintah CLI di workflow YML)
        const regex = new RegExp(`(['"]${dep}['"\/])|(\\b${dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'g');
        
        if (regex.test(content)) {
          usageDetails.get(dep).push(fullPath);
        }
      });
    }
  }
}

console.log('🔍 Investigasi Maksimal (JS + HTML + YAML) Layar Kosong... \n');
scanFiles('./');

console.log('='.repeat(80));
console.log('📊 LAPORAN PENGGUNAAN PAKET (TOTAL SCAN)');
console.log('='.repeat(80));

const unused = [];

usageDetails.forEach((fileList, dep) => {
  const uniqueFiles = [...new Set(fileList)];
  if (uniqueFiles.length > 0) {
    console.log(`✅ ${dep.toUpperCase()}`);
    console.log(`   Ditemukan di ${uniqueFiles.length} lokasi:`);
    uniqueFiles.forEach(f => console.log(`   - ${f}`));
    console.log('');
  } else {
    unused.push(dep);
    console.log(`❌ ${dep.toUpperCase()}`);
    console.log(`   (SAMA SEKALI TIDAK DITEMUKAN)\n`);
  }
});

console.log('='.repeat(80));
if (unused.length > 0) {
  console.log(`\n💡 Mas Bro, paket ini resmi jadi "penumpang gelap":`);
  console.log(`👉 npm uninstall ${unused.join(' ')}`);
} else {
  console.log('\n✨ Bersih! Semua paket ternyata punya andil di kode atau workflow.');
}
console.log('='.repeat(80) + '\n');
