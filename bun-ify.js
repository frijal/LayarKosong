import fs from 'fs/promises';
import path from 'path';

const targetDir = './ext'; // Folder tempat script generator Mas

async function bunify(filePath) {
  // 0. Baca konten asli
  let content = await fs.readFile(filePath, 'utf8');

  // --- PROSES BACKUP ---
  const backupPath = `${filePath}.bak`;
  await fs.writeFile(backupPath, content);
  console.log(`💾 Backup dibuat: ${backupPath}`);
  // ---------------------

  // 1. Ganti fs.readFile menjadi Bun.file().text()
  content = content.replace(
    /await\s+fs\.readFile\(([^,)]+)(?:,\s*['"]utf8['"])?\)/g,
    'await Bun.file($1).text()'
  );

  // 2. Ganti fs.writeFile menjadi Bun.write()
  content = content.replace(
    /await\s+fs\.writeFile\(([^,]+),\s*([^)]+)\)/g,
    'await Bun.write($1, $2)'
  );

  // 3. Ganti fs.readdir menjadi Bun.Glob (Spesifik untuk file .html)
  content = content.replace(
    /await\s+fs\.readdir\(([^)]+)\)/g,
    'await (async () => { const glob = new Bun.Glob("*.html"); return [...glob.scanSync($1)]; })()'
  );

  // 4. Update Import (Opsional: Mengarahkan ke Bun jika ingin benar-benar murni)
  // Kita biarkan saja fs/promises tetap ada untuk fungsi yang belum ter-replace.

  // Simpan file yang sudah dimodifikasi
  await fs.writeFile(filePath, content);
  console.log(`⚡ ${filePath} telah di-Bunify!`);
}

// Jalankan Pemindaian
try {
  const files = await fs.readdir(targetDir);
  console.log(`🔍 Memulai proses konversi di folder: ${targetDir}`);
  
  for (const file of files) {
    // Pastikan hanya memproses file .js dan bukan file backup itu sendiri
    if (file.endsWith('.js') && !file.endsWith('.bak.js')) {
      await bunify(path.join(targetDir, file));
    }
  }
  console.log('\n✅ Semua file selesai diproses. Jika ada masalah, cek file .bak');
} catch (err) {
  console.error('❌ Terjadi kesalahan:', err.message);
}
