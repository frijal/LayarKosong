import { execSync } from "child_process";
import { writeFileSync } from "fs";

// Mengambil dari ENV yang dikirim oleh GitHub Actions
const API_TOKEN = process.env.CF_API_TOKEN;
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const KV_ID = process.env.CLOUDFLARE_ID_KV;

async function migrate() {
  console.log("🚀 Mengambil data dari KV Namespace...");
  
  // Ambil Keys via REST API (Cara paling stabil/independen dari versi Wrangler)
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/keys`, {
    headers: { "Authorization": `Bearer ${API_TOKEN}` }
  });
  const data = await res.json();
  const keys = data.result || [];

  console.log(`📊 Ditemukan ${keys.length} key. Memproses...`);
  
  let sqlCommands = [];

  for (const k of keys) {
    const keyName = k.name;
    // Ambil Value
    const vRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/${encodeURIComponent(keyName)}`, {
      headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    const valText = await vRes.text();
    
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
  console.log("✅ File 'migrasi-kv-ke-d1.sql' siap!");
}

migrate();
