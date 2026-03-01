import { execSync } from 'node:child_process';
import { readdir, stat, rm } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

/**
 * KONFIGURASI INVESTIGASI
 */
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', '.well-known'];
const EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.html', '.yml', '.yaml'];
const SCRIPT_NAME = basename(import.meta.url);

async function main() {
  // 1. Load package.json
  const pkgFile = Bun.file("./package.json");
  if (!(await pkgFile.exists())) {
    console.error("❌ package.json tidak ditemukan!");
    return;
  }

  const pkg = await pkgFile.json();
  const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const usageMap = new Map<string, Set<string>>();
  allDeps.forEach(dep => usageMap.set(dep, new Set()));

  console.log('🔍 Memulai Investigasi Maksimal Layar Kosong (Bun Mode)...');

  // 2. Fungsi Scan Rekursif (Asynchronous & Parallel)
  async function scan(dir: string) {
    const items = await readdir(dir);
    const tasks = items.map(async (item) => {
      const fullPath = join(dir, item);
      if (IGNORE_DIRS.includes(item)) return;

      const s = await stat(fullPath);
      if (s.isDirectory()) {
        await scan(fullPath);
      } else {
        const ext = extname(item);
        if (EXTENSIONS.includes(ext) && item !== SCRIPT_NAME) {
          const content = await Bun.file(fullPath).text();
          allDeps.forEach(dep => {
            const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(['"]${escapedDep}['"\/])|(\\b${escapedDep}\\b)`, 'g');
            if (regex.test(content)) {
                usageMap.get(dep)?.add(fullPath);
            }
          });
        }
      }
    });
    await Promise.all(tasks);
  }

  await scan("./");

  // 3. Filter Paket Unused
  const unused: string[] = [];
  console.log('='.repeat(80));
  console.log('📊 LAPORAN PENGGUNAAN PAKET');
  console.log('='.repeat(80));

  usageMap.forEach((files, dep) => {
    if (files.size > 0) {
      console.log(`✅ ${dep.toUpperCase()} (${files.size} lokasi)`);
    } else {
      // Pengecualian khusus wrangler agar aman di Cloudflare
      if (dep !== 'wrangler') {
        unused.push(dep);
        console.log(`❌ ${dep.toUpperCase()} (TIDAK DITEMUKAN)`);
      } else {
        console.log(`✅ WRANGLER (Dikecualikan)`);
      }
    }
  });

  console.log('='.repeat(80));

  // 4. Proses Uninstall & Hard Reset
  if (unused.length > 0) {
    console.log(`\n🧹 Menghapus paket mubazir: ${unused.join(', ')}`);
    try {
      // Gunakan bun remove agar cepat
      execSync(`bun remove ${unused.join(' ')}`, { stdio: 'inherit' });
    } catch (e) {
      console.error('⚠️ Gagal uninstall otomatis, lanjut ke reset manual...');
    }
  }

  console.log('\n🗑️  Menghapus node_modules dan lockfiles...');
  const targets = ['node_modules', 'package-lock.json', 'bun.lockb', 'bun.lock'];
  for (const target of targets) {
    await rm(target, { recursive: true, force: true }).catch(() => {});
  }

  console.log('📦 Instal ulang dependensi (Hard Reset)...');
  try {
    // Bun install jauh lebih cepat daripada npm install
    execSync('bun install', { stdio: 'inherit' });
    console.log('\n✨ SEMUA SELESAI! Repo Layar Kosong sekarang super optimal dan bersih.');
  } catch (err: any) {
    console.error('❌ Gagal saat instal ulang:', err.message);
  }
}

main().catch(console.error);
