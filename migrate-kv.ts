import { writeFileSync } from "fs";

// 🔴 GANTI DUA BARIS INI DENGAN DATA ASLIMU 🔴
const ACCOUNT_ID = "6cc48a342566fd658c88dd1d725ad474"; 
const API_TOKEN = "cfat_tivBVw8RfsuFo5YB4xbQvruCk5oDwnUXIPEZArimfa283127"; 

const KV_ID = "5c5197918fee41a0b79f4212c00a7552";

async function panenData() {
    console.log("🚀 Menghubungi Server Cloudflare via API...");
    
    const keysResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/keys`, {
        headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    
    const keysData = await keysResponse.json();

    if (!keysData.success) {
        console.log("❌ Gagal Akses API. Alasan dari Cloudflare:");
        console.log(JSON.stringify(keysData.errors, null, 2));
        process.exit(1);
    }

    const keys = keysData.result;
    console.log(`📊 Sukses! Ditemukan ${keys.length} keys di dalam KV.`);
    
    if (keys.length === 0) {
        console.log("⚠️ Ternyata datanya memang 0.");
        process.exit(0);
    }

    let sql = [];
    let counter = 1;

    for (const k of keys) {
        const keyName = k.name;
        
        // NYALAKAN LOG-NYA + TAMBAH COUNTER BIAR NGGAK KELIATAN STUCK
        console.log(`⏳ [${counter}/${keys.length}] Mengekstrak: ${keyName}`);
        counter++;
        
        const valResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_ID}/values/${encodeURIComponent(keyName)}`, {
            headers: { "Authorization": `Bearer ${API_TOKEN}` }
        });
        
        // Jaga-jaga kalau Cloudflare ngambek (Rate Limit 429)
        if (!valResponse.ok) {
            console.error(`⚠️ Gagal mengambil ${keyName} (Status: ${valResponse.status}). Lanjut ke data berikutnya...`);
            continue;
        }


        const rawVal = await valResponse.text();
        const cleanVal = rawVal.trim();

        let v = 0, t = 1;
        
        // Cek apakah datanya murni angka polos (format lama)
        if (/^\d+$/.test(cleanVal)) {
            v = parseInt(cleanVal, 10);
            t = 1; // Karena data lama tidak menyimpan visitor unik, kita set 1
        } else {
            // Kalau bukan angka polos, coba parse sebagai JSON (format baru)
            try {
                const parsed = JSON.parse(cleanVal);
                v = parsed.v ?? 0;
                t = parsed.t ?? 1;
            } catch {
                console.error(`⚠️ Format tidak dikenal pada ${keyName}: ${cleanVal}`);
            }
        }

        // ==========================================
        // 🛡️ FILTER PRETTY URL SUPER KETAT
        // ==========================================
        let cleanPath = keyName.replace(/^view:/, "");
        
        if (cleanPath !== "/" && cleanPath.endsWith("/")) {
            cleanPath = cleanPath.slice(0, -1);
        }

        cleanPath = cleanPath.replace(/\.(html|php)$/, "");

        if (!cleanPath.startsWith("/")) {
            cleanPath = "/" + cleanPath;
        }
        // ==========================================

        sql.push(`INSERT INTO page_stats (path, views, visitors) VALUES ('${cleanPath}', ${v}, ${t}) ON CONFLICT(path) DO UPDATE SET views = views + excluded.views, visitors = visitors + excluded.visitors;`);
    }

    writeFileSync("migrasi.sql", sql.join("\n"));
    console.log(`\n✅ MISSION ACCOMPLISHED! Berhasil memproses ${sql.length} data ke file 'migrasi.sql' (Pretty URL murni)!`);
}

panenData();
