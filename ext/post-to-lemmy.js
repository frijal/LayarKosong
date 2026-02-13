import fs from "fs";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-lemmy.txt",
  baseUrl: "https://dalam.web.id",
  instanceUrl: "https://sh.itjust.works",
  username: process.env.LEMMY_USERNAME,
  password: process.env.LEMMY_PASSWORD,
  targetCommunities: [
    "blogs@lemmy.ml",
    "casualconversation@piefed.social",
    "communitypromo@lemmy.ca",
    "indonesia@lemmy.ml"
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
      const [title, fileName, imageUrl, isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');
      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      allArticles.push({
        title,
        url: fullUrl,
        image: imageUrl,
        date: isoDate,
        desc: description
      });
    }
  }

  allArticles.sort((a, b) => b.date.localeCompare(a.date));

  // 3. PROSES POSTING (LOGIKA NINJA: 1 POST PER RUN)
  let selectedTask = null;

  // Acak komunitas supaya tidak selalu posting ke yang itu-itu saja tiap 4 jam
  const shuffledCommunities = [...CONFIG.targetCommunities].sort(() => Math.random() - 0.5);

  for (const communityName of shuffledCommunities) {
    // Cari artikel terbaru yang belum pernah diposting ke komunitas spesifik ini
    const target = allArticles.find(art => !postedLog.includes(`${art.url} [${communityName}]`));

    if (target) {
      selectedTask = { target, communityName };
      break;
    }
  }

  if (!selectedTask) {
    console.log("✅ Semua artikel sudah terdistribusi merata. Tidak ada tugas sesi ini.");
    return;
  }

  const { target, communityName } = selectedTask;

  try {
    const commRes = await fetch(`${CONFIG.instanceUrl}/api/v3/community?name=${communityName}&auth=${jwt}`);
    const commData = await commRes.json();
    const communityId = commData.community_view?.community?.id;

    if (!communityId) {
      console.error(`❌ Komunitas ${communityName} tidak ditemukan.`);
      return;
    }

    console.log(`🚀 Sesi ini: Mengirim "${target.title}" ke ${communityName}...`);

    const postRes = await fetch(`${CONFIG.instanceUrl}/api/v3/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
    //    "User-Agent": "LayarKosongBlogBot/1.4 (https://dalam.web.id)" // <-- Harus di dalam sini
      }, // <-- Penutup headers
      body: JSON.stringify({
        name: target.title,
        url: target.url,
        body: target.desc,
        thumbnail_url: target.image,
        community_id: communityId,
        language_id: 65,
        auth: jwt
      })
    });

    if (postRes.ok) {
      const newEntry = `${target.url} [${communityName}]`;

      // Update Log
      let currentLogs = fs.existsSync(CONFIG.databaseFile)
      ? fs.readFileSync(CONFIG.databaseFile, "utf8").split("\n").filter(line => line.trim() !== "")
      : [];

      currentLogs.push(newEntry);
      currentLogs.sort();
      fs.writeFileSync(CONFIG.databaseFile, currentLogs.join("\n") + "\n");

      console.log(`✅ Berhasil diposting!`);
    } else {
      const errData = await postRes.json();
      console.error(`❌ Gagal di ${communityName}:`, errData.error);
    }

  } catch (err) {
    console.error(`❌ Error sistem:`, err.message);
  }
}

run();
