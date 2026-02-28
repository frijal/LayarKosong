/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-discord.txt",
  baseUrl: "https://dalam.web.id",
  webhookUrl: Bun.env.DISCORD_WEBHOOK_URL,
  botName: "Layar Kosong",
  botAvatar: "https://dalam.web.id/favicon.png",
};

/* =====================
 * Interfaces
 * ===================== */
type RawArticle = [string, string, any, string, string?];
interface ArticleData {
  [category: string]: RawArticle[];
}

interface Article {
  title: string;
  url: string;
  date: string;
  desc: string;
}

/* =====================
 * Utilities
 * ===================== */
const slugify = (text: string): string =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

/* =====================
 * Main Logic
 * ===================== */
async function run(): Promise<void> {
  if (!CONFIG.webhookUrl) {
    console.error("❌ Error: DISCORD_WEBHOOK_URL belum diset.");
    process.exit(1);
  }

  const articleFile = Bun.file(CONFIG.articleFile);
  if (!(await articleFile.exists())) {
    console.error(`❌ Error: ${CONFIG.articleFile} tidak ditemukan.`);
    process.exit(1);
  }

  // Load Database pakai Bun.file
  const dbFile = Bun.file(CONFIG.databaseFile);
  const postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

  const rawData = (await articleFile.json()) as ArticleData;
  let allArticles: Article[] = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, , isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');

      // --- FILTER AGREGAT ---
      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allArticles.push({
          title,
          url: fullUrl,
          date: isoDate,
          desc: description || "Archive."
        });
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
  const messageContent = `${target.url}\n\n**${target.title}**\n${target.desc}`;

  const payload = {
    username: CONFIG.botName,
    avatar_url: CONFIG.botAvatar,
    content: messageContent,
  };

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(await response.text());

    // Simpan Log pakai Bun.write (otomatis handle append dengan cara baca dulu + tulis baru)
    const newContent = postedDatabase + target.url + "\n";
    await Bun.write(CONFIG.databaseFile, newContent);

    console.log(`✅ Berhasil! Artikel terposting sebagai plain text.`);

  } catch (err: any) {
    console.error("❌ Gagal posting:", err.message);
    process.exit(1);
  }
}

// Jalankan fungsi utama
run();
