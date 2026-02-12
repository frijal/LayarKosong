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
  embedColor: 0x00ffcc, // Hijau toska
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
    console.error("❌ Error: DISCORD_WEBHOOK_URL is not defined.");
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.articleFile)) {
    console.error(`❌ Error: ${CONFIG.articleFile} tidak ditemukan.`);
    process.exit(1);
  }

  // 1. Load Database
  let postedDatabase = "";
  if (fs.existsSync(CONFIG.databaseFile)) {
    postedDatabase = fs.readFileSync(CONFIG.databaseFile, "utf8");
  }

  // 2. Parsing Data Artikel
  const rawData = JSON.parse(fs.readFileSync(CONFIG.articleFile, "utf8"));
  let allArticles = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);

    for (const item of items) {
      // Struktur array kamu: [Title, FileName, ImageUrl, Date, Description]
      const [title, fileName, imageUrl, isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allArticles.push({
          title,
          url: fullUrl,
          imageUrl: imageUrl, // Mengambil URL gambar dari array index ke-2
          slug: fileSlug,
          date: isoDate,
          desc: description || "Archive.",
          category
        });
      }
    }
  }

  // 3. Ambil artikel terbaru
  allArticles.sort((a, b) => b.date.localeCompare(a.date));
  const target = allArticles[0];

  if (!target) {
    console.log("🏁 Discord: Semua artikel sudah terposting.");
    return;
  }

  // 4. Siapkan Payload untuk Discord
  console.log(`🚀 Mengirim ke Discord: ${target.title}`);

  const payload = {
    username: CONFIG.botName,
    avatar_url: CONFIG.botAvatar,
    embeds: [
      {

        title: target.title,
        url: target.url,
        color: CONFIG.embedColor,
        image: {
          url: target.imageUrl
        },
        description: target.desc || "Archive.",
        footer: {
          text: "Layar Kosong - Personal Blog",
          icon_url: CONFIG.botAvatar
        },
        fields: [
          { name: "🖥️ Kategori", value: target.category, inline: true },
          { name: "⏱️ Terbit", value: new Date(target.date).toLocaleDateString('id-ID'), inline: true },
        ],

      }
    ]
  };

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API Error: ${errorText}`);
    }

    /* =========================================
     * 5. SIMPAN LOG (URL Saja)
     * ========================================= */
    if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
    fs.appendFileSync(CONFIG.databaseFile, target.url + "\n");

    console.log(`✅ Berhasil! Log disimpan di ${CONFIG.databaseFile}`);

  } catch (err) {
    console.error("❌ Gagal posting:", err.message);
    process.exit(1);
  }
}

run();
