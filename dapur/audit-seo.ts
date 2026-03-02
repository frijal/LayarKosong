import { readFile, writeFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { glob } from "glob";

// Konfigurasi
const FOLDERS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno", "artikel"];
const REPORT_PATH = `./mini/laporan-audit-${new Date().toISOString().split('T')[0].replace(/-/g, '')}.md`;

const TITLES: Record<number, string> = {
    1: "🏷️ Core Meta & Branding",
    2: "🌐 Social Meta & Creators",
    3: "📊 Open Graph (OG) Tags",
    4: "🐦 Twitter & Article Meta",
    5: "🖼️ Image Meta & Alt Text",
    6: "🛠️ Assets & Descriptions"
};

async function auditSEO() {
    console.log("🚀 Memulai Audit SEO ala Bun...");
    const results: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    // Ambil semua file HTML
    const files = await glob(`./{${FOLDERS.join(",")}}/**/*.html`, { recursive: true });

    for (const filePath of files) {
        const content = await readFile(filePath, "utf-8");
        const window = new Window();
        const document = window.document;
        document.write(content);

        const issues: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

        // HELPER BARU: Pakai fungsi ini supaya kalau selector gagal, script nggak mati
        const safeQuery = (selector: string) => {
            try {
                return document.querySelector(selector);
            } catch (e) {
                return null;
            }
        };

        // 1. CORE & BRANDING
        if (!safeQuery('link[rel="canonical"]')) issues[1].push("Canonical Tag");
        if (!safeQuery('link[rel="icon"]')) issues[1].push("Favicon.ico");

        // Kita pakai cara lebih umum untuk meta author & theme
        const metaAuthor = Array.from(document.querySelectorAll('meta')).find(m => m.getAttribute('name') === 'author');
        if (!metaAuthor || metaAuthor.getAttribute('content') !== "Fakhrul Rijal") issues[1].push("Author");

        const metaTheme = Array.from(document.querySelectorAll('meta')).find(m => m.getAttribute('name') === 'theme-color');
        if (!metaTheme) issues[1].push("Theme Color");

        if (!safeQuery('link[rel="license"]')) issues[1].push("CC0 License Link");
        if (!safeQuery('meta[name="robots"]')) issues[1].push("Robots Meta");

        // 2. SOCIAL CREATORS
        const allMetas = Array.from(document.querySelectorAll('meta'));
        if (!allMetas.find(m => m.getAttribute('name') === 'fediverse:creator')) issues[2].push("Fediverse Creator");
        if (!allMetas.find(m => m.getAttribute('name') === 'twitter:creator')) issues[2].push("Twitter Creator");
        if (!allMetas.find(m => m.getAttribute('name') === 'bluesky:creator')) issues[2].push("Bluesky Creator");

        // 3. OPEN GRAPH (OG) - Menggunakan property
        if (!allMetas.find(m => m.getAttribute('property') === 'og:site_name')) issues[3].push("OG Site Name");
        if (!allMetas.find(m => m.getAttribute('property') === 'og:locale')) issues[3].push("OG Locale");
        if (!allMetas.find(m => m.getAttribute('property') === 'og:type')) issues[3].push("OG Type Article");
        if (!allMetas.find(m => m.getAttribute('property') === 'og:url')) issues[3].push("OG URL");
        if (!allMetas.find(m => m.getAttribute('property') === 'og:title')) issues[3].push("OG Title");

        // 4. TWITTER & FACEBOOK
        if (!allMetas.find(m => m.getAttribute('name') === 'twitter:card')) issues[4].push("Twitter Card");
        if (!allMetas.find(m => m.getAttribute('property') === 'article:author')) issues[4].push("Article Author (FB)");

        // 5. IMAGES
        if (!allMetas.find(m => m.getAttribute('property') === 'og:image')) issues[5].push("OG Image");
        if (!allMetas.find(m => m.getAttribute('name') === 'twitter:image')) issues[5].push("Twitter Image");

        const images = document.querySelectorAll('img');
        let noAltCount = 0;
        images.forEach(img => {
            if (!img.getAttribute('alt')) noAltCount++;
        });
            if (noAltCount > 0) issues[5].push(`${noAltCount} Image(s) missing Alt text`);

            // 6. ASSETS
            if (!safeQuery('link[type="application/rss+xml"]')) issues[6].push("RSS Feed Link");
            if (!safeQuery('script[type="application/ld+json"]')) issues[6].push("Schema JSON-LD");
            if (!allMetas.find(m => m.getAttribute('name') === 'description')) issues[6].push("Meta Description");

        // Rekap ke results
        for (let i = 1; i <= 6; i++) {
            if (issues[i].length > 0) {
                results[i].push(`| \`${filePath}\` | ${issues[i].join("<br>")} |`);
            }
        }
    }

    // Generate Markdown Report
    let report = `# 📋 Hasil Audit SEO Layar Kosong (Bun Engine)\n`;
    report += `📅 Tanggal Audit: ${new Date().toLocaleString('id-ID')}\n\n`;

    for (let i = 1; i <= 6; i++) {
        report += `<details>\n<summary><b>${TITLES[i]} (${results[i].length} Masalah)</b></summary>\n\n`;
        report += `| File | Masalah Terdeteksi |\n| :--- | :--- |\n`;
        report += results[i].length > 0 ? results[i].join("\n") : "| - | ✅ Semua beres |";
        report += `\n\n</details>\n\n`;
    }

    await Bun.write(REPORT_PATH, report);
    console.log(`✅ Laporan selesai dibuat di: ${REPORT_PATH}`);
}

auditSEO();
