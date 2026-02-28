/**
 * Konfigurasi
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-facebook.txt",
  domainUrl: "https://dalam.web.id",
  // Ambil dari FB Graph API Explorer
  pageId: Bun.env.FB_PAGE_ID,
  accessToken: Bun.env.FB_ACCESS_TOKEN,
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
  slug: string;
  date: string;
  desc: string;
  category: string;
}

/* =====================
 * Utils
 * ===================== */
const slugify = (text: string): string =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

/* =====================
 * Main Logic
 * ===================== */
async function main() {
  // 1. Validasi Env
  if (!CONFIG.pageId || !CONFIG.accessToken) {
    console.error("❌ Error: FB_PAGE_ID atau FB_ACCESS_TOKEN belum diset.");
    process.exit(1);
  }

  // 2. Load Files
  const articleFile = Bun.file(CONFIG.articleFile);
  const dbFile = Bun.file(CONFIG.databaseFile);

  if (!(await articleFile.exists())) {
    console.error("❌ Error: artikel.json tidak ditemukan");
    process.exit(1);
  }

  const data = (await articleFile.json()) as ArticleData;
  const postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

  // 3. Parsing & Filtering
  const allPosts: Article[] = [];
  for (const [categoryName, posts] of Object.entries(data)) {
    const catSlug = slugify(categoryName);
    for (const post of posts) {
      const fileName = String(post[1] || "").trim();
      const fileSlug = fileName.replace(/\.html$/i, "").replace(/\//g, "");

      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${CONFIG.domainUrl}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: post[0] || "Untitled",
          slug: fileSlug,
          url: fullUrl,
          date: post[3] || "",
          desc: post[4] || "Archive.",
          category: categoryName,
        });
      }
    }
  }

  allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allPosts.length === 0) {
    console.log("✅ Facebook: Tidak ada artikel baru.");
    return;
  }

  const target = allPosts[0];
  const catHashtag = "#" + target.category.replace(/\s+/g, "").toLowerCase();
  const message = `${target.desc}\n\n${target.title}\n\n${catHashtag}\n\n${target.url}`;

  // 4. Langsung Post ke Facebook Graph API
  console.log(`🚀 Memposting ke Facebook Page: ${target.title}`);

  try {
    const fbUrl = `https://graph.facebook.com/v25.0/${CONFIG.pageId}/feed`;
    const response = await fetch(fbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        link: target.url,
        access_token: CONFIG.accessToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Gagal posting ke FB");
    }

    // 5. Simpan Log jika berhasil
    const newContent = postedDatabase + target.url + "\n";
    await Bun.write(CONFIG.databaseFile, newContent);

    console.log(`✅ Berhasil! Facebook Post ID: ${result.id}`);

  } catch (err: any) {
    console.error("❌ Gagal total:", err.message);
    process.exit(1);
  }
}

main();
