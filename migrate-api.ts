import { writeFileSync } from "fs";

const API_TOKEN = "GANTI_DENGAN_TOKEN_KAMU"; // 👈 Isi CF_API_TOKEN dari secret
const ACCOUNT_ID = "GANTI_DENGAN_ACCOUNT_ID_KAMU"; // 👈 Isi CLOUDFLARE_ACCOUNT_ID
const KV_ID = "5c5197918fee41a0b79f4212c00a7552";

async function migrate() {
  console.log("🚀 Mengambil data langsung dari API Cloudflare...");
  
  // 1. Ambil daftar Keys
  const keysRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/keys`, {
    headers: { "Authorization": `Bearer ${API_TOKEN}` }
  });
  const keysData = await keysRes.json();
  
  if (!keysData.success) {
    console.error("❌ Gagal ambil keys:", keysData.errors);
    return;
  }

  const keys = keysData.result;
  console.log(`📊 Ditemukan ${keys.length} key.`);
  
  let sqlCommands = [];

  // 2. Ambil Value per Key
  for (const k of keys) {
    const keyName = k.name;
    const valRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/${encodeURIComponent(keyName)}`, {
      headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    const valText = await valRes.text();
    
    let stats = { v: 0, t: 0 };
    try {
      stats = JSON.parse(valText);
    } catch {
      stats = { v: parseInt(valText) || 0, t: 1 };
    }

    const cleanPath = keyName.replace(/^view:/, "");
    sqlCommands.push(
      `INSERT INTO page_stats (path, views, visitors) VALUES ('${cleanPath}', ${stats.v}, ${stats.t}) ` +
      `ON CONFLICT(path) DO UPDATE SET views = views + excluded.views, visitors = visitors + excluded.visitors;`
    );
  }

  writeFileSync("migrasi-kv-ke-d1.sql", sqlCommands.join("\n"));
  console.log("✅ Berhasil! File 'migrasi-kv-ke-d1.sql' sudah jadi.");
}

migrate();
