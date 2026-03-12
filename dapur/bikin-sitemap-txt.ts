import fs from "fs";

const BASE_URL = "https://dalam.web.id";
const SITEMAP_PATH = "sitemap.txt";
const ARTIKEL_JSON = "artikel.json";

function slugify(text: string) {
    return text.toLowerCase().trim().replace(/\s+/g, "-");
}

try {
    const data = JSON.parse(fs.readFileSync(ARTIKEL_JSON, "utf8"));
    const articleList = [];

    // 1. Kumpulkan Artikel
    for (const [cat, posts] of Object.entries(data) as [string, any[]][]) {
        const catSlug = slugify(cat);
        posts.forEach(p => {
            articleList.push({
                url: `${BASE_URL}/${catSlug}/${p[1].replace('.html', '').replace(/^\//, '')}`,
                date: new Date(p[3].substring(0, 10))
            });
        });
    }

    // 2. Sortir: Lama -> Baru
    articleList.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 3. URL Statis
    const manualUrls = [
        "", "/jejak-sejarah", "/lainnya", "/olah-media", 
        "/opini-sosial", "/sistem-terbuka", "/warta-tekno", 
        "/gaya-hidup", "/about", "/privacy", "/search", 
        "/security-policy", "/data-deletion-form", "/disclaimer", 
        "/feed", "/img", "/lisensi", "/sitemap"
    ].map(u => `${BASE_URL}${u}`);

    // 4. Gabungkan & Hilangkan Duplikat
    const allUrls = [...new Set([...manualUrls, ...articleList.map(a => a.url)])];

    // 5. Simpan
    fs.writeFileSync(SITEMAP_PATH, allUrls.join("\n") + "\n");
    console.log(`✅ ${SITEMAP_PATH} berhasil dibuat dengan ${allUrls.length} URL.`);
} catch (error) {
    console.error("❌ Gagal membuat sitemap:", error);
    process.exit(1);
}
