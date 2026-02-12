import fs from "fs";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-lemmy.txt",
  baseUrl: "https://dalam.web.id",
  instanceUrl: "https://lemmus.org",
  username: process.env.LEMMY_USERNAME,
  password: process.env.LEMMY_PASSWORD,
  // DAFTAR KOMUNITAS TARGET (Tambahkan sebanyak yang kamu mau)
  targetCommunities: [
    "world@lemmy.world",
    "indonesia@lemmy.ml"
  ]
};

const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-');

async function run() {
  if (!CONFIG.username || !CONFIG.password) {
    console.error("❌ Error: Username/Password belum diset di env.");
    process.exit(1);
  }

  // 1. Login (Satu kali saja di awal)
  console.log(`🔑 Login ke ${CONFIG.instanceUrl}...`);
  const loginRes = await fetch(`${CONFIG.instanceUrl}/api/v3/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username_or_email: CONFIG.username, password: CONFIG.password })
  });
  const loginData = await loginRes.json();
  const jwt = loginData.jwt;
  if (!jwt) throw new Error("Gagal login.");

  // 2. Load Database & Artikel
  const postedLog = fs.existsSync(CONFIG.databaseFile) ? fs.readFileSync(CONFIG.databaseFile, "utf8") : "";
  const rawData = JSON.parse(fs.readFileSync(CONFIG.articleFile, "utf8"));
  let allArticles = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, , isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;
      allArticles.push({ title, url: fullUrl, date: isoDate, desc: description });
    }
  }

  // Urutkan artikel terbaru (LIFO)
  allArticles.sort((a, b) => b.date.localeCompare(a.date));
  const latestArticle = allArticles[0];

  if (!latestArticle) return console.log("🏁 Tidak ada artikel.");

  console.log(`📑 Memproses artikel terbaru: "${latestArticle.title}"`);

  // 3. Loop Posting ke Setiap Komunitas
  for (const communityName of CONFIG.targetCommunities) {
    const logKey = `[${communityName}] ${latestArticle.url}`;

    // Cek apakah artikel ini SUDAH diposting ke komunitas SPESIFIK ini
    if (postedLog.includes(logKey)) {
      console.log(`⏩ Skipped: Sudah pernah dipost ke ${communityName}`);
      continue;
    }

    try {
      // Cari ID Komunitas
      const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${communityName}`);
      const commData = await commRes.json();
      const communityId = commData.community_view?.community?.id;

      if (!communityId) {
        console.error(`❌ Komunitas ${communityName} tidak ditemukan.`);
        continue;
      }

      // Kirim Post
      console.log(`🚀 Mengirim ke ${communityName}...`);
      const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: latestArticle.title,
          url: latestArticle.url,
          body: latestArticle.desc,
          community_id: communityId,
          auth: jwt
        })
      });

      if (postRes.ok) {
        // 4. Simpan Log Spesifik Komunitas
        fs.appendFileSync(CONFIG.databaseFile, logKey + "\n");
        console.log(`✅ Berhasil di ${communityName}`);
      } else {
        const errData = await postRes.json();
        console.error(`❌ Gagal di ${communityName}:`, errData.error);
      }

      // Beri jeda sedikit biar tidak dianggap spamming oleh server
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`❌ Error saat memproses ${communityName}:`, err.message);
    }
  }
}

run();
