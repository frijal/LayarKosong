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
  targetCommunities: [
    "world@lemmy.world",
    "indonesia@lemmy.ml",
    "blogs@lemmy.ml",
    "blogspot@lemmy.world",
"youshouldknow@lemmy.world",
"newcommunities@lemmy.world"
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

  // 2. LOAD SEMUA ARTIKEL
  const postedLog = fs.existsSync(CONFIG.databaseFile) ? fs.readFileSync(CONFIG.databaseFile, "utf8") : "";
  const rawData = JSON.parse(fs.readFileSync(CONFIG.articleFile, "utf8"));
  let allArticles = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      // SESUAIKAN DESTRUCTURING ARRAY DI SINI
      const [title, fileName, imageUrl, isoDate, description] = item;

      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      allArticles.push({
        title,
        url: fullUrl,
        image: imageUrl, // Simpan URL gambar dari indeks [2]
        date: isoDate,
        desc: description
      });
    }
  }

  allArticles.sort((a, b) => b.date.localeCompare(a.date));

  // 3. PROSES POSTING
  let articlePointer = 0;

  for (const communityName of CONFIG.targetCommunities) {
    let successPosting = false;

    while (articlePointer < allArticles.length && !successPosting) {
      const target = allArticles[articlePointer];
      const logKey = `${target.url} [${communityName}]`;

      if (postedLog.includes(logKey)) {
        articlePointer++;
        continue;
      }

      try {
        const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${communityName}&auth=${jwt}`);
        const commData = await commRes.json();
        const communityId = commData.community_view?.community?.id;

        if (!communityId) {
          console.error(`❌ Komunitas ${communityName} tidak ditemukan.`);
          break;
        }

        console.log(`🚀 [Antrean ${articlePointer}] Mengirim "${target.title}" ke ${communityName}...`);

        const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` },
          body: JSON.stringify({
            name: target.title,
            url: target.url,
            body: target.desc,
            thumbnail_url: target.image, // MASUKKAN URL GAMBAR KE SINI
            community_id: communityId,
            auth: jwt
          })
        });

        if (postRes.ok) {
          // 1. Baca isi log yang sudah ada
          let currentLogs = fs.existsSync(CONFIG.databaseFile)
          ? fs.readFileSync(CONFIG.databaseFile, "utf8").split("\n").filter(line => line.trim() !== "")
          : [];

          // 2. Tambahkan log baru dengan format: URL [Komunitas]
          const newEntry = `${target.url} [${communityName}]`;
          currentLogs.push(newEntry);

          // 3. SORT secara Alphabetical
          currentLogs.sort();

          // 4. Tulis ulang ke file (overwrite) agar urutannya tersimpan
          fs.writeFileSync(CONFIG.databaseFile, currentLogs.join("\n") + "\n");

          console.log(`✅ Berhasil di ${communityName}`);
          successPosting = true;
          articlePointer++;
        }
        else {
          const errData = await postRes.json();
          console.error(`❌ Gagal di ${communityName}:`, errData.error);
          break;
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
