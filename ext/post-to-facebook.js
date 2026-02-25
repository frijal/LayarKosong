import fs from "node:fs";
import path from "node:path";

// Konfigurasi Path & URL
const JSON_FILE = "artikel.json";
const DATABASE_FILE = "mini/posted-facebook.txt";
const DOMAIN_URL = "https://dalam.web.id";

function slugify(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function main() {
  // 1. Cek file artikel.json
  if (!fs.existsSync(JSON_FILE)) {
    console.error("❌ Error: artikel.json tidak ditemukan");
    process.exit(1);
  }

  // 2. Load data menggunakan Bun (Cepat)
  const data = await Bun.file(JSON_FILE).json();

  // 3. Load database posted
  let postedDatabase = "";
  if (fs.existsSync(DATABASE_FILE)) {
    postedDatabase = await Bun.file(DATABASE_FILE).text();
  }

  const allPosts = [];
  for (const [categoryName, posts] of Object.entries(data || {})) {
    const catSlug = slugify(categoryName);

    if (!Array.isArray(posts)) continue;
    for (const post of posts) {
      // Struktur: [0:judul, 1:slug, 2:image, 3:date(ISO), 4:desc]
      const fileName = String(post[1] || "").trim();
      const fileSlug = fileName.replace(/\.html$/i, "").replace(/\//g, "");

      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${DOMAIN_URL}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: post[0] || "Untitled",
          slug: fileSlug,
          url: fullUrl,
          date: post[3] || "",
          desc: post[4] || "Archive.",
          category: categoryName,
        });
      }
    }
  }

  // Sorting Terbaru -> Lama
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allPosts.length > 0) {
    const targetPost = allPosts[0];

    // Persiapan Pesan
    const catHashtag = "#" + targetPost.category.replace(/\s+/g, "").toLowerCase();
    const fullMsg = `${targetPost.desc}\n\n${targetPost.title}\n\n${catHashtag}\n\n${targetPost.url}`;

    // URL Encoding untuk kebutuhan API/GitHub Actions
    const encodedMsg = encodeURIComponent(fullMsg);

    // Output untuk GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${targetPost.url}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `encoded_msg=${encodedMsg}\n`);
    }

    // Simpan log sementara (opsional)
    await Bun.write("/tmp/temp_new_url_facebook.txt", targetPost.url + "\n");

    console.log(`✅ Berhasil memproses untuk Facebook: ${targetPost.url}`);

    // Note: Jika kamu punya API Facebook Page, kamu bisa panggil di sini.
    // Jika tidak, GitHub Actions bisa menggunakan 'encoded_msg' ini
    // untuk dikirim via bot lain (seperti Messenger/Telegram bot).

  } else {
    console.log("✅ Tidak ada artikel baru untuk Facebook.");
  }
}

main();