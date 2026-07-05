import { execSync } from "child_process";
import { writeFileSync } from "fs";

const KV_ID = "5c5197918fee41a0b79f4212c00a7552";

console.log("🚀 Mengambil daftar keys dari KV (Mode Remote)...");

try {
  // Tanpa --format=json, dan WAJIB tambah --remote
  const rawOutput = execSync(`bunx wrangler kv key list --namespace-id=${KV_ID} --remote`).toString();
  
  // Kadang wrangler nambahin log text sebelum JSON, jadi kita cari karakter '['
  const jsonMatch = rawOutput.match(/\[.*\]/s);
  if (!jsonMatch) {
    throw new Error("Tidak menemukan data JSON dalam output: " + rawOutput);
  }
  
  const keys = JSON.parse(jsonMatch[0]);
  console.log(`📊 Ditemukan ${keys.length} key. Mulai proses...`);

  if (keys.length === 0) {
    console.log("⚠️ Namespace kosong, tidak ada data untuk dipindahkan.");
    process.exit(0);
  }

  let sqlCommands = [];

  for (const k of keys) {
    const keyName = k.name;
    console.log(`⏳ Membaca: ${keyName}`);
    
    // Sama, tambah --remote di sini juga
    const valueStr = execSync(`bunx wrangler kv key get --namespace-id=${KV_ID} "${keyName}" --remote`).toString().trim();
    
    let stats = { v: 0, t: 0 };
    try {
      stats = JSON.parse(valueStr);
    } catch {
      stats = { v: parseInt(valueStr) || 0, t: 1 };
    }

    const cleanPath = keyName.replace(/^view:/, "");
    sqlCommands.push(
      `INSERT INTO page_stats (path, views, visitors) VALUES ('${cleanPath}', ${stats.v}, ${stats.t}) ` +
      `ON CONFLICT(path) DO UPDATE SET views = views + excluded.views, visitors = visitors + excluded.visitors;`
    );
  }

  writeFileSync("migrasi-kv-ke-d1.sql", sqlCommands.join("\n"));
  console.log("\n✅ BERHASIL! File migrasi-kv-ke-d1.sql sudah siap!");

} catch (err) {
  console.error("❌ Gagal:", err);
}
