import fs from "fs";

const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-lemmy.txt",
  baseUrl: "https://dalam.web.id",
  instanceUrl: "https://lemmus.org",
  username: process.env.LEMMY_USERNAME,
  password: process.env.LEMMY_PASSWORD,
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
    console.error("❌ Error: Username/Password belum diset di GitHub Secrets.");
    process.exit(1);
  }

  // 1. LOGIN
  console.log(`🔑 Login ke ${CONFIG.instanceUrl}...`);
  const loginRes = await fetch(`${CONFIG.instanceUrl}/api/v3/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      username_or_email: CONFIG.username, 
      password: CONFIG.password 
    })
  });

  const loginData = await loginRes.json();
  const jwt = loginData.jwt;

  if (!jwt) {
    console.error("❌ Login Gagal Total:", loginData.error || "Cek kredensial.");
    process.exit(1);
  }

  // 2. LOAD ARTIKEL
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

  allArticles.sort((a, b) => b.date.localeCompare(a.date));
  const latestArticle = allArticles[0];
  if (!latestArticle) return;

  console.log(`📑 Artikel: "${latestArticle.title}"`);

  // 3. LOOP POSTING
  for (const communityName of CONFIG.targetCommunities) {
    const logKey = `[${communityName}] ${latestArticle.url}`;

    if (postedLog.includes(logKey)) {
      console.log(`⏩ Skipped: ${communityName}`);
      continue;
    }

    try {
      // CARI ID KOMUNITAS (Penting: kirim 'auth' juga di sini!)
      const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${communityName}&auth=${jwt}`);
      const commData = await commRes.json();
      const communityId = commData.community_view?.community?.id;

      if (!communityId) {
        console.error(`❌ Komunitas ${communityName} tidak ditemukan.`);
        continue;
      }

      console.log(`🚀 Mengirim ke ${communityName}...`);
      
      // POSTING (Kirim auth di body dan headers untuk memastikan)
      const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}` 
        },
        body: JSON.stringify({
          name: latestArticle.title,
          url: latestArticle.url,
          body: latestArticle.desc,
          community_id: communityId,
          auth: jwt // <--- WAJIB ADA DI SINI
        })
      });

      const postResult = await postRes.json();

      if (postRes.ok) {
        fs.appendFileSync(CONFIG.databaseFile, logKey + "\n");
        console.log(`✅ Berhasil di ${communityName}`);
      } else {
        // Jika masih gagal, cetak error lengkapnya
        console.error(`❌ Gagal di ${communityName}:`, postResult.error);
      }

      await new Promise(r => setTimeout(r, 3000)); // Jeda 3 detik

    } catch (err) {
      console.error(`❌ Error sistem di ${communityName}:`, err.message);
    }
  }
}

run();
