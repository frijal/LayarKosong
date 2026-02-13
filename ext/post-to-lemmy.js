import fs from "fs";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-lemmy.txt",
  baseUrl: "https://dalam.web.id",
  username: process.env.LEMMY_USERNAME,
  password: process.env.LEMMY_PASSWORD,
  // Target komunitas dalam format 'nama@domain'
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
    console.error("❌ Error: Username/Password belum diset di environment variables.");
    process.exit(1);
  }

  // 1. LOAD SEMUA ARTIKEL (Sama seperti sebelumnya)
  if (!fs.existsSync(CONFIG.articleFile)) {
    console.error("❌ File artikel.json tidak ditemukan!");
    return;
  }

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

  // 2. PROSES POSTING PER KOMUNITAS
  let articlePointer = 0;

  for (const fullCommunityName of CONFIG.targetCommunities) {
    // Pecah 'indonesia@lemmy.ml' jadi 'indonesia' dan 'https://lemmy.ml'
    const [commName, instanceDomain] = fullCommunityName.split('@');
    const instanceUrl = `https://${instanceDomain}`;

    console.log(`\n--- 🌐 Berpindah ke Instance: ${instanceUrl} ---`);

    try {
      // STEP A: LOGIN KE INSTANCE TERKAIT
      const loginRes = await fetch(`${instanceUrl}/api/v3/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_or_email: CONFIG.username, password: CONFIG.password })
      });

      const loginData = await loginRes.json();
      const jwt = loginData.jwt;

      if (!jwt) {
        console.error(`❌ Gagal login ke ${instanceUrl}. Lewati instance ini.`);
        continue;
      }

      let successPosting = false;

      // STEP B: CARI ARTIKEL YANG BELUM DI-POST KE KOMUNITAS INI
      while (articlePointer < allArticles.length && !successPosting) {
        const target = allArticles[articlePointer];
        const postedLog = fs.existsSync(CONFIG.databaseFile) ? fs.readFileSync(CONFIG.databaseFile, "utf8") : "";
        const logKey = `${target.url} [${fullCommunityName}]`;

        if (postedLog.includes(logKey)) {
          articlePointer++;
          continue;
        }

        // STEP C: AMBIL COMMUNITY ID DI INSTANCE LOKAL
        const commRes = await fetch(`${instanceUrl}/api/v3/community?name=${commName}&auth=${jwt}`);
        const commData = await commRes.json();
        const communityId = commData.community_view?.community?.id;

        if (!communityId) {
          console.error(`❌ Komunitas ${commName} tidak ditemukan di ${instanceUrl}.`);
          break; // Pindah ke target komunitas berikutnya
        }

        console.log(`🚀 Mengirim "${target.title}" ke ${fullCommunityName}...`);

        // STEP D: EKSEKUSI POSTING
        const postRes = await fetch(`${instanceUrl}/api/v3/post`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: target.title,
            url: target.url,
            body: target.desc,
            thumbnail_url: target.image,
            community_id: communityId,
            auth: jwt // Lemmy API lebih stabil jika auth ditaruh di body
          })
        });

        if (postRes.ok) {
          // UPDATE LOG
          let currentLogs = fs.existsSync(CONFIG.databaseFile)
          ? fs.readFileSync(CONFIG.databaseFile, "utf8").split("\n").filter(l => l.trim() !== "")
          : [];

          currentLogs.push(logKey);
          currentLogs.sort();
          fs.writeFileSync(CONFIG.databaseFile, currentLogs.join("\n") + "\n");

          console.log(`✅ Berhasil di ${fullCommunityName}`);
          successPosting = true;
          articlePointer++;
        } else {
          const errData = await postRes.json();
          console.error(`❌ Gagal di ${fullCommunityName}:`, errData.error || "Unknown Error");
          break;
        }

        // Jeda 10 detik biar gak dianggap spam brutal oleh admin instance
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (err) {
      console.error(`⚠️ Error fatal saat memproses ${fullCommunityName}:`, err.message);
    }
  }
  console.log("\n✨ Semua antrean selesai diproses.");
}

run();