import fs from "fs";

/**
 * CONFIGURATION
 * Simpan LEMMY_USERNAME dan LEMMY_PASSWORD di environment variables.
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-lemmy.txt",
  baseUrl: "https://dalam.web.id",
  instanceUrl: "https://lemm.ee", // Instance yang kamu gunakan
  username: process.env.LEMMY_USERNAME,
  password: process.env.LEMMY_PASSWORD,
  communityName: "lemmus", // Nama komunitas tujuan (bukan ID angka)
};

const slugify = (text) => text.toLowerCase().trim().replace(/\s+/g, '-');

async function run() {
  if (!CONFIG.username || !CONFIG.password) {
    console.error("❌ Error: Username/Password Lemmy belum diatur.");
    process.exit(1);
  }

  // 1. Login untuk mendapatkan JWT Token
  console.log("🔑 Mencoba login ke Lemmy...");
  const loginRes = await fetch(`${CONFIG.instanceUrl}/api/v3/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username_or_email: CONFIG.username,
      password: CONFIG.password
    })
  });

  const loginData = await loginRes.json();
  if (!loginData.jwt) {
    console.error("❌ Login Gagal:", loginData.error);
    process.exit(1);
  }
  const jwt = loginData.jwt;

  // 2. Cari ID Komunitas berdasarkan Nama
  const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${CONFIG.communityName}`);
  const commData = await commRes.json();
  const communityId = commData.community_view?.community?.id;

  if (!communityId) {
    console.error(`❌ Komunitas ${CONFIG.communityName} tidak ditemukan.`);
    process.exit(1);
  }

  // 3. Load Data Artikel (Logika yang sama dengan script Discord kamu)
  const postedDatabase = fs.existsSync(CONFIG.databaseFile) ? fs.readFileSync(CONFIG.databaseFile, "utf8") : "";
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
    console.log("🏁 Lemmy: Tidak ada artikel baru.");
    return;
  }

  // 4. Buat Post di Lemmy
  console.log(`🚀 Memposting ke Lemm.ee: ${target.title}`);
  const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`
    },
    body: JSON.stringify({
      name: target.title,      // Judul di kolom URL
      url: target.url,        // Link yang ditaruh di kolom URL
      body: target.desc,      // Isi pesan di kolom teks
      community_id: communityId,
      auth: jwt               // Lemmy API butuh auth di body juga
    })
  });

  if (postRes.ok) {
    fs.appendFileSync(CONFIG.databaseFile, target.url + "\n");
    console.log("✅ Berhasil posting ke Lemmus!");
  } else {
    const err = await postRes.text();
    console.error("❌ Gagal posting:", err);
  }
}

run();
