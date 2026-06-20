// scripts/upload-ai.ts
import { readFileSync } from "fs";

// Mengambil variabel yang dikirim dari rahasia GitHub Actions
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const INSTANCE_ID = "layarkosong-search-index";

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("❌ Eror: Variabel kredensial Cloudflare tidak ditemukan di ekosistem GitHub.");
  process.exit(1);
}

// Menggunakan endpoint resmi multipart/form-data (max 4MB) yang lu temukan tadi
const API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai-search/namespaces/default/instances/${INSTANCE_ID}/items`;

async function uploadPart(content: string, filename: string) {
  const formData = new FormData();
  const blob = new Blob([content], { type: "text/markdown" });
  
  // Bungkus ke format multipart/form-data dengan key "file" sesuai dokumentasi Cloudflare
  formData.append("file", blob, filename);

  console.log(`📤 Meluncurkan ${filename} (${(blob.size / (1024 * 1024)).toFixed(2)} MB)...`);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`
    },
    body: formData
  });

  const resData: any = await response.json();

  if (resData.success) {
    console.log(`✅ ${filename} sukses mendarat di database vektor!`);
  } else {
    console.error(`❌ ${filename} ditolak server:`, JSON.stringify(resData.errors || resData.error));
  }
}

async function main() {
  try {
    console.log("📖 Membaca berkas raksasa llms.md dari repositori...");
    const content = readFileSync("llms.md", "utf-8");
    const lines = content.split("\n");

    // Potong tepat di tengah baris biar adil (6,3MB dibagi dua = ~3,15MB, aman dari limit 4MB)
    const midPoint = Math.floor(lines.length / 2);
    const part1Text = lines.slice(0, midPoint).join("\n");
    const part2Text = lines.slice(midPoint).join("\n");

    console.log("✂️ Berhasil membelah file menjadi 2 bagian di memori runner.");

    // Kirim berurutan menggunakan token sakti lu
    await uploadPart(part1Text, "llms_part_1.md");
    await uploadPart(part2Text, "llms_part_2.md");

    console.log("🏁 Sinkronisasi AI Search via Jalur Belakang Sukses Terkendali!");
  } catch (error: any) {
    console.error("❌ Terjadi kegagalan fatal pada skrip:", error.message);
  }
}

main();
