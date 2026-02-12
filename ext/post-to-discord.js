import fs from "fs";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-discord.txt",
  baseUrl: "https://dalam.web.id",
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  botName: "Layar Kosong",
  botAvatar: "https://dalam.web.id/favicon.png",
};

/* =====================
 * Utilities
 * ===================== */
const slugify = (text) =>
text.toLowerCase().trim().replace(/\s+/g, '-');

/* =====================
 * Main Logic
 * ===================== */
async function run() {
  if (!CONFIG.webhookUrl) {
    console.error("❌ Error: DISCORD_WEBHOOK_URL belum diset.");
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.articleFile)) {
    console.error(`❌ Error: ${CONFIG.articleFile} tidak ditemukan.`);
    process.exit(1);
  }

  let postedDatabase = fs.existsSync(CONFIG.databaseFile)
  ? fs.readFileSync(CONFIG.databaseFile, "utf8")
  : "";

  const rawData = JSON.parse(fs.readFileSync(CONFIG.articleFile, "utf8"));
  let allArticles = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, , isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allArticles.push({ title, url: fullUrl, date: isoDate, desc: description });
      }
    }
  }

  allArticles.sort((a, b) => b.date.localeCompare(a.date));
  const target = allArticles[0];

  if (!target) {
    console.log("🏁 Discord: Semua artikel sudah terposting.");
    return;
  }

  console.log(`🚀 Mengirim Plain Text ke Discord: ${target.title}`);

  // Format Pesan: Judul (Tebal) -> Deskripsi -> URL
  const messageContent = `**${target.title}**\n${target.desc || "Archive."}\n\n${target.url}`;

  const payload = {
    username: CONFIG.botName,
    avatar_url: CONFIG.botAvatar,
    content: messageContent, // Menggunakan 'content' bukan 'embeds'
  };

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(await response.text());

    // Simpan Log (Hanya URL)
    if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
    fs.appendFileSync(CONFIG.databaseFile, target.url + "\n");

    console.log(`✅ Berhasil! Artikel terposting sebagai plain text.`);

  } catch (err) {
    console.error("❌ Gagal posting:", err.message);
    process.exit(1);
  }
}

run();
