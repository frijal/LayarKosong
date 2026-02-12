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
  // Avatar bot di samping nama bot tetap ada agar tidak default,
  // tapi kita hilangkan dari dalam kotak Embed.
  botAvatar: "https://dalam.web.id/favicon.png",
  embedColor: 0x00ffcc,
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

  let postedDatabase = fs.existsSync(CONFIG.databaseFile)
  ? fs.readFileSync(CONFIG.databaseFile, "utf8")
  : "";

  const rawData = JSON.parse(fs.readFileSync(CONFIG.articleFile, "utf8"));
  let allArticles = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, imageUrl, isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allArticles.push({ title, url: fullUrl, imageUrl, slug: fileSlug, date: isoDate, desc: description, category });
      }
    }
  }

  allArticles.sort((a, b) => b.date.localeCompare(a.date));
  const target = allArticles[0];

  if (!target) {
    console.log("🏁 Discord: Semua artikel sudah terposting.");
    return;
  }

  console.log(`🚀 Mengirim ke Discord: ${target.title}`);

  const payload = {
    username: CONFIG.botName,
    avatar_url: CONFIG.botAvatar,
    embeds: [
      {
        title: target.title,
        url: target.url,
        color: CONFIG.embedColor,
        // Gambar artikel ditaruh di Thumbnail (Pojok Kanan Atas)
        thumbnail: {
          url: target.imageUrl
        },
        // Deskripsi otomatis akan berada di samping & bawah thumbnail secara mengalir
        description: target.desc || "Archive.",
        fields: [
          { name: "📁 Kategori", value: target.category, inline: true },
          { name: "📅 Tanggal", value: new Date(target.date).toLocaleDateString('id-ID'), inline: true },
        ],
        footer: {
          text: "Layar Kosong - Personal Blog"
          // icon_url Dihapus sesuai permintaan (hilangkan avatar di bawah)
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(await response.text());

    if (!fs.existsSync("mini")) fs.mkdirSync("mini", { recursive: true });
    fs.appendFileSync(CONFIG.databaseFile, target.url + "\n");
    console.log(`✅ Berhasil! Log URL disimpan.`);

  } catch (err) {
    console.error("❌ Gagal posting:", err.message);
    process.exit(1);
  }
}

run();
