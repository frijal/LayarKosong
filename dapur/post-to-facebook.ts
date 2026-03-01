/**
 * Konfigurasi
 */
const CONFIG = {
    articleFile: "artikel.json",
    databaseFile: "mini/posted-facebook.txt",
    domainUrl: "https://dalam.web.id",
    // Gunakan FB_PAGE_TOKEN sesuai nama secret di YAML kamu
    pageId: Bun.env.FB_PAGE_ID,
    accessToken: Bun.env.FB_PAGE_TOKEN,
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
    // 1. Validasi Env (Menggunakan FB_PAGE_TOKEN agar sinkron dengan secrets GitHub)
    if (!CONFIG.pageId || !CONFIG.accessToken) {
        console.error("❌ Error: FB_PAGE_ID atau FB_PAGE_TOKEN belum diset di environment.");
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

            // Cek apakah URL sudah pernah diposting
            if (!postedDatabase.includes(fullUrl) && !postedDatabase.includes(fileSlug)) {
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

    // Sorting Terbaru (ISO Date comparison)
    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allPosts.length === 0) {
        console.log("✅ Facebook: Tidak ada artikel baru untuk diposting.");
        return;
    }

    const target = allPosts[0];
    const catHashtag = "#" + target.category.replace(/\s+/g, "").toLowerCase();
    const message = `${target.desc}\n\n${target.title}\n\n${catHashtag}\n\n${target.url}`;

    // 4. Eksekusi Post (Menggantikan peran curl di YAML)
    console.log(`🚀 Mengirim ke Facebook Page: ${target.title}`);

    try {
        const fbUrl = `https://graph.facebook.com/v25.0/${CONFIG.pageId}/feed`;

        // Menggunakan URLSearchParams untuk mensimulasikan 'curl -d'
        const params = new URLSearchParams();
        params.append("message", message);
        params.append("link", target.url);
        params.append("access_token", CONFIG.accessToken);

        const response = await fetch(fbUrl, {
            method: "POST",
            body: params,
        });

        const result = (await response.json()) as any;

        if (!response.ok) {
            // Jika error, tampilkan detailnya agar mudah debug di GitHub Actions
            console.error("❌ Detail Response Facebook:", result);
            throw new Error(result.error?.message || "Gagal posting ke FB");
        }

        // 5. Update Database (Hanya jika fetch berhasil)
        // Menambahkan URL ke database agar tidak dipost ulang di kemudian hari
        const newContent = postedDatabase + (postedDatabase.endsWith('\n') ? '' : '\n') + target.url + "\n";
        await Bun.write(CONFIG.databaseFile, newContent);

        console.log(`✅ Berhasil! Artikel terposting. FB Post ID: ${result.id}`);

    } catch (err: any) {
        console.error("❌ Fatal Error saat posting:", err.message);
        // Gunakan exit 0 jika ingin workflow GitHub tetap 'hijau' meski FB gagal,
        // atau exit 1 jika ingin workflow berhenti/merah.
        process.exit(1);
    }
}

main();
