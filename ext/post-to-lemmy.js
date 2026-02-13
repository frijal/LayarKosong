import fs from "fs";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-lemmy.txt",
  baseUrl: "https://dalam.web.id",
  instanceUrl: "https://lemmy.world",
  username: process.env.LEMMY_USERNAME,
  password: process.env.LEMMY_PASSWORD,
  // Daftar komunitas target
  targetCommunities: [
    "world@lemmy.world",
    "indonesia@lemmy.ml",
    "blogs@lemmy.ml",
    "blogspot@lemmy.world"
  ]
};

const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-');

async function run() {
  if (!CONFIG.username || !CONFIG.password) {
    console.error("❌ Error: Secrets belum diset.");
    process.exit(1);
  }

  // 1. LOGIN
  const loginRes = await fetch(`${CONFIG.instanceUrl}/api/v3/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username_or_email: CONFIG.username, password: CONFIG.password })
  });
  const loginData = await loginRes.json();
  const jwt = loginData.jwt;
  if (!jwt) throw new Error("Gagal login.");

  // 2. LOAD SEMUA ARTIKEL & URUTKAN (Terbaru ke Terlama)
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

  // Urutkan dari yang paling baru
  allArticles.sort((a, b) => b.date.localeCompare(a.date));

  // 3. PROSES SETIAP KOMUNITAS DENGAN ARTIKEL BERBEDA
  let articlePointer = 0; // Mulai dari artikel terbaru (indeks 0)

  for (const communityName of CONFIG.targetCommunities) {
    let successPosting = false;

    // Cari artikel yang belum pernah diposting ke komunitas ini
    while (articlePointer < allArticles.length && !successPosting) {
      const target = allArticles[articlePointer];
      const logKey = `[${communityName}] ${target.url}`;

      if (postedLog.includes(logKey)) {
        // Jika artikel ini sudah pernah di post ke komunitas ini, cari artikel berikutnya (selisih satu)
        articlePointer++;
        continue;
      }

      try {
        // Cari ID Komunitas
        const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${communityName}&auth=${jwt}`);
        const commData = await commRes.json();
        const communityId = commData.community_view?.community?.id;

        if (!communityId) {
          console.error(`❌ Komunitas ${communityName} tidak ditemukan.`);
          break; // Pindah ke komunitas berikutnya jika tidak ketemu
        }

        console.log(`🚀 [Antrean ${articlePointer}] Mengirim "${target.title}" ke ${communityName}...`);
        
        const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` },
          body: JSON.stringify({
            name: target.title,
            url: target.url,
            body: target.desc,
            community_id: communityId,
            auth: jwt
          })
        });

        if (postRes.ok) {
          fs.appendFileSync(CONFIG.databaseFile, logKey + "\n");
          console.log(`✅ Berhasil di ${communityName}`);
          successPosting = true; 
          // Setelah berhasil, geser pointer agar komunitas selanjutnya dapat artikel "selisih satu" (indeks berikutnya)
          articlePointer++; 
        } else {
          const errData = await postRes.json();
          console.error(`❌ Gagal di ${communityName}:`, errData.error);
          break; // Jika gagal karena sistem, stop untuk komunitas ini
        }

        await new Promise(r => setTimeout(r, 3000));

      } catch (err) {
        console.error(`❌ Error di ${communityName}:`, err.message);
        break;
      }
    }
  }
}

run();
