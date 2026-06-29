import { BskyAgent } from "@atproto/api";
import fs from "node:fs";
import path from "node:path";

// --- CONFIG ---
const JSON_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-bluesky.txt";
const DOMAIN_URL = "https://dalam.web.id";

function slugify(text) {
  if (!text) return "";
  return String(text).trim().toLowerCase().replace(/\s+/g, "-");
}

async function main() {
  // 1. Validasi File
  if (!fs.existsSync(JSON_FILE)) {
    console.error("❌ Error: artikel.json tidak ditemukan");
    process.exit(1);
  }

  // 2. Load Data menggunakan Bun.file (Native & Fast)
  const data = await Bun.file(JSON_FILE).json();

  let postedDatabase = "";
  if (fs.existsSync(DATABASE_FILE)) {
    postedDatabase = await Bun.file(DATABASE_FILE).text();
  }

  // 3. Filter Artikel
  const allPosts = [];
  for (const [categoryName, posts] of Object.entries(data || {})) {
    const catSlug = slugify(categoryName);
    if (!Array.isArray(posts)) continue;

    for (const post of posts) {
      const fileName = String(post[1] ?? "").trim();
      const fileSlug = fileName.replace(/\.html$/i, "").replace(/\//g, "");

      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${DOMAIN_URL}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: post[0] ?? "Untitled",
          slug: fileSlug,
          url: fullUrl,
          image_url: post[2] ?? "",
          date: post[3] ?? "",
          desc: post[4] ?? "Archive.",
          category: categoryName,
        });
      }
    }
  }

  // Sorting Terbaru
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allPosts.length === 0) {
    console.log("✅ Tidak ada artikel baru untuk Bluesky.");
    return;
  }

  const targetPost = allPosts[0];
  const handle = Bun.env.BSKY_HANDLE;
  const password = Bun.env.BSKY_PASSWORD;

  if (!handle || !password) {
    console.error("❌ Error: BSKY_HANDLE / BSKY_PASSWORD belum diset di .env atau Secrets");
    process.exit(1);
  }

  // 4. Bluesky Auth
  const agent = new BskyAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  // 5. Handle Image & Embed (Menggunakan fetch bawaan Bun)
  let embedExternal = null;
  if (targetPost.image_url) {
    try {
      console.log(`📸 Mendownload gambar: ${targetPost.image_url}`);
      const response = await fetch(targetPost.image_url);

      if (response.ok) {
        const blob = await response.blob();
        const uploadRes = await agent.uploadBlob(new Uint8Array(await blob.arrayBuffer()), {
          encoding: blob.type,
        });

        embedExternal = {
          external: {
            uri: targetPost.url,
            title: targetPost.title,
            description: targetPost.desc,
            thumb: uploadRes.data.blob,
          },
        };
      }
    } catch (err) {
      console.warn("⚠️ Gagal memproses gambar, lanjut posting tanpa gambar:", err.message);
    }
  }

  // 6. Posting
  try {
    let message = targetPost.desc;
    if (message.length > 290) message = message.slice(0, 287) + "...";

    await agent.post({
      text: message,
      embed: embedExternal || undefined,
    });

    // 7. Simpan ke Database agar tidak posting ulang
    fs.appendFileSync(DATABASE_FILE, `${targetPost.slug}\n`);

    // Output untuk GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `bsky_url=${targetPost.url}\n`);
    }

    console.log(`✅ Berhasil posting ke Bluesky: ${targetPost.title}`);
  } catch (err) {
    console.error("❌ Gagal mengirim ke Bluesky:", err.message);
    process.exit(1);
  }
}

main();