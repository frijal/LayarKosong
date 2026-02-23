import fs from 'fs/promises';
import path from 'path';

const workflowDir = './.github/workflows';

async function bunifyYml(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');

    // --- PROSES BACKUP ---
    const backupPath = `${filePath}.bak`;
    await fs.writeFile(backupPath, content);
    console.log(`💾 Backup workflow dibuat: ${backupPath}`);

    // 1. Ganti Setup Node.js menjadi Setup Bun
    // Mencari pattern actions/setup-node dan menggantinya
    content = content.replace(
      /uses:\s*actions\/setup-node@v\d+/g,
      'uses: oven-sh/setup-bun@v2'
    );

    // 2. Hapus baris 'node-version' karena Bun biasanya pakai 'latest' atau tidak wajib
    content = content.replace(/\s+node-version:.*\n/g, '\n');

    // 3. Ganti 'npm install' atau 'npm ci' menjadi 'bun install'
    content = content.replace(/npm\s+(install|ci)/g, 'bun install');

    // 4. Ganti eksekusi script: 'node' atau 'npm run' menjadi 'bun run'
    // Mengganti 'node script.js' atau 'npm run script'
    content = content.replace(/node\s+([\w\/\.-]+\.js)/g, 'bun run $1');
    content = content.replace(/npm\s+run\s+/g, 'bun run ');

    // 5. Bersihkan baris kosong ganda yang mungkin muncul akibat penghapusan node-version
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    await fs.writeFile(filePath, content);
    console.log(`⚡ Workflow ${path.basename(filePath)} telah di-Bunify!`);
  } catch (err) {
    console.error(`❌ Gagal memproses ${filePath}:`, err.message);
  }
}

// Jalankan Pemindaian Folder Workflow
try {
  const files = await fs.readdir(workflowDir);
  console.log(`🔍 Mencari file .yml di: ${workflowDir}`);

  for (const file of files) {
    if ((file.endsWith('.yml') || file.endsWith('.yaml')) && !file.endsWith('.bak')) {
      await bunifyYml(path.join(workflowDir, file));
    }
  }
  console.log('\n✅ Semua workflow berhasil diupdate ke Bun.');
} catch (err) {
  console.log('💡 Folder .github/workflows tidak ditemukan atau kosong.');
}
