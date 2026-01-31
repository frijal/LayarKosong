#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __scriptName = path.basename(__filename);

// --- KONFIGURASI INVESTIGASI (Sesuai Request Mas Bro) ---
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out']; 
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.html', '.yml', '.yaml']; 

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

const usageDetails = new Map();
allDeps.forEach(dep => usageDetails.set(dep, []));

// --- FUNGSI SCAN (Logika Investigasi Maksimal) ---
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
        // Regex Fleksibel (Kutip & CLI Pattern)
        const regex = new RegExp(`(['"]${dep}['"\/])|(\\b${dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'g');
        
        if (regex.test(content)) {
          usageDetails.get(dep).push(fullPath);
        }
      });
    }
  }
}

async function runCleanup() {
  console.log('🔍 Memulai Investigasi Maksimal Layar Kosong...');
  scanFiles('./');

  console.log('='.repeat(80));
  console.log('📊 LAPORAN PENGGUNAAN PAKET');
  console.log('='.repeat(80));

  const unused = [];

  usageDetails.forEach((fileList, dep) => {
    const uniqueFiles = [...new Set(fileList)];
    if (uniqueFiles.length > 0) {
      console.log(`✅ ${dep.toUpperCase()} (${uniqueFiles.length} lokasi)`);
    } else {
      // Pengecualian khusus wrangler agar tidak terhapus jika Mas Bro mau
      if (dep !== 'wrangler') {
        unused.push(dep);
        console.log(`❌ ${dep.toUpperCase()} (TIDAK DITEMUKAN)`);
      } else {
        console.log(`✅ WRANGLER (Dikecualikan)`);
      }
    }
  });

  console.log('='.repeat(80));

  if (unused.length > 0) {
    console.log(`\n🧹 Menghapus paket mubazir: ${unused.join(', ')}`);
    try {
      execSync(`npm uninstall ${unused.join(' ')}`, { stdio: 'inherit' });
    } catch (e) {
      console.error('⚠️ Gagal uninstall beberapa paket, lanjut ke reset...');
    }
  } else {
    console.log('\n✨ Bersih! Tidak ada paket siluman.');
  }

  // --- BAGIAN HARD RESET (Jangan Dikurangi) ---
  console.log('\n🗑️  Menghapus node_modules dan package-lock.json...');
  if (fs.existsSync('node_modules')) fs.rmSync('node_modules', { recursive: true, force: true });
  if (fs.existsSync('package-lock.json')) fs.rmSync('package-lock.json', { force: true });

  console.log('📦 Instal ulang dependensi agar fresh...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('\n✨ SEMUA SELESAI! Repo Layar Kosong sekarang super optimal.');
  } catch (err) {
    console.error('❌ Gagal saat instal ulang:', err.message);
  }
}

runCleanup().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
