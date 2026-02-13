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
    "fediverse@lemmy.world",
    "indonesia@lemmy.ml",
    "blogs@lemmy.ml",
    "blogspot@lemmy.world",
    "youshouldknow@lemmy.world",
    "newcommunities@lemmy.world",
    "communitypromo@lemmy.ca",
    "casualconversation@piefed.social",
    "Independent_Media@lemmy.today",
    "wildfeed@sh.itjust.works"
  ]
};

const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-');

async function run() {
  if (!CONFIG.username || !CONFIG.password) {
    console.error("❌ Error: Secrets belum diset.");
    process.exit(1);
  }

  // 1. LOGIN (Cukup sekali ke instance utama)
  console.log(`🔑 Mencoba login ke ${CONFIG.instanceUrl}...`);
  const loginRes = await fetch(`${CONFIG.instanceUrl}/api/v3/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "LayarKosongBot/2.4 (+https://dalam.web.id)"
    },
    body: JSON.stringify({ username_or_email: CONFIG.username, password: CONFIG.password })
  });

  const loginData = await loginRes.json();
  const jwt = loginData.jwt;
  if (!jwt) throw new Error("Gagal login. Cek username/password atau status ban.");
  console.log("✅ Login Berhasil!");

  // 2. LOAD SEMUA ARTIKEL
  const rawData = JSON.parse(fs.readFileSync(CONFIG.articleFile, "utf8"));
  let allArticles = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, imageUrl, isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      allArticles.push({
        title,
        url: `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`,
        image: imageUrl,
        date: isoDate,
        desc: description
      });
    }
  }
  allArticles.sort((a, b) => b.date.localeCompare(a.date));

  // 3. PROSES POSTING
  let articlePointer = 0;

  for (const communityName of CONFIG.targetCommunities) {
    const postedLog = fs.existsSync(CONFIG.databaseFile) ? fs.readFileSync(CONFIG.databaseFile, "utf8") : "";
    let successPosting = false;

    while (articlePointer < allArticles.length && !successPosting) {
      const target = allArticles[articlePointer];
      const logKey = `${target.url} [${communityName}]`;

      if (postedLog.includes(logKey)) {
        articlePointer++;
        continue;
      }

      try {
        // Ambil ID Komunitas
        const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${communityName}&auth=${jwt}`);
        const commData = await commRes.json();
        const communityId = commData.community_view?.community?.id;

        if (!communityId) {
          console.error(`❌ Komunitas ${communityName} tidak ditemukan/tidak terfederasi.`);
          break;
        }

        console.log(`🚀 Mengirim "${target.title}" ke ${communityName}...`);

        const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "LayarKosongBot/2.4 (+https://dalam.web.id)"
          },
          body: JSON.stringify({
            name: target.title,
            url: target.url,
            body: target.desc,
            thumbnail_url: target.image,
            community_id: communityId,
            auth: jwt
          })
        });

        if (postRes.ok) {
          let currentLogs = fs.existsSync(CONFIG.databaseFile)
          ? fs.readFileSync(CONFIG.databaseFile, "utf8").split("\n").filter(line => line.trim() !== "")
          : [];
          currentLogs.push(logKey);
          currentLogs.sort();
          fs.writeFileSync(CONFIG.databaseFile, currentLogs.join("\n") + "\n");

          console.log(`✅ Berhasil di ${communityName}`);
          successPosting = true;
          articlePointer++;
        } else {
          const errData = await postRes.json();
          console.error(`❌ Gagal di ${communityName}:`, errData.error);
          break;
        }

        // JEDA LEBIH LAMA: 30-60 detik secara acak agar tidak terbaca bot pattern
        const randomDelay = Math.floor(Math.random() * (60000 - 30000 + 1) + 30000);
        console.log(`☕ Istirahat dulu ${randomDelay/1000} detik...`);
        await new Promise(r => setTimeout(r, randomDelay));

      } catch (err) {
        console.error(`❌ Error di ${communityName}:`, err.message);
        break;
      }
    }
  }
}

run();