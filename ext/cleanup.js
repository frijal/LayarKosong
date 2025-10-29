#!/usr/bin/env node
/**
 * ===================================================================
 * CLEANUP AUTO v1.1
 * Hapus paket tidak terpakai dan reinstall otomatis (non-interaktif)
 * Cocok untuk workflow GitHub Actions
 * ===================================================================
 */
import { execSync } from 'node:child_process';
import depcheck from 'depcheck';
import fs from 'node:fs';

(async () => {
  console.log('🚀 Memeriksa paket tidak terpakai...');
  
  // FIX: Tambahkan objek kosong {} sebagai argumen kedua untuk 'options'
  const result = await depcheck(process.cwd(), {});
  
  const unused = [...result.dependencies, ...result.devDependencies];

  if (unused.length === 0) {
    console.log('✅ Tidak ada paket yang perlu dihapus.');
  } else {
    console.log('🧹 Menghapus paket:', unused.join(', '));
    execSync(`npm uninstall ${unused.join(' ')}`, { stdio: 'inherit' });
  }

  console.log('🗑️ Menghapus node_modules dan package-lock.json...');
  fs.rmSync('node_modules', { recursive: true, force: true });
  fs.rmSync('package-lock.json', { force: true });

  console.log('📦 Instal ulang paket...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('✨ Cleanup selesai tanpa prompt!');
})();
