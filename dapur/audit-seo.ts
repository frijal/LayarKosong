import { readFile, writeFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { glob } from "glob";

// Konfigurasi
const FOLDERS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno"];
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

        // Helper untuk cek selector
        const check = (selector: string) => document.querySelector(selector);

        // 1. CORE & BRANDING
        if (!check('link[rel="canonical"]')) issues[1].push("Canonical Tag");
        if (!check('link[rel="icon"]')) issues[1].push("Favicon.ico");
        if (!document.querySelector('meta[name="author"][content="Fakhrul Rijal"]')) issues[1].push("Author");
        if (!document.querySelector('meta[name="theme-color"][content="#00b0ed"]')) issues[1].push("Theme Color");
        if (!check('link[rel="license"]')) issues[1].push("CC0 License Link");
        if (!check('meta[name="robots"]')) issues[1].push("Robots Meta");

        // 2. SOCIAL CREATORS
        if (!check('meta[name="fediverse:creator"]')) issues[2].push("Fediverse Creator");
        if (!check('meta[name="twitter:creator"]')) issues[2].push("Twitter Creator");
        if (!check('meta[name="bluesky:creator"]')) issues[2].push("Bluesky Creator");

        // 3. OPEN GRAPH (OG)
        if (!check('meta[property="og:site_name"]')) issues[3].push("OG Site Name");
        if (!document.querySelector('meta[property="og:locale"][content="id_ID"]')) issues[3].push("OG Locale");
        if (!document.querySelector('meta[property="og:type"][content="article"]')) issues[3].push("OG Type Article");
        if (!check('meta[property="og:url"]')) issues[3].push("OG URL");
        if (!check('meta[property="og:title"]')) issues[3].push("OG Title");

        // 4. TWITTER & FACEBOOK
        if (!check('meta[name="twitter:card"]')) issues[4].push("Twitter Card");
        if (!check('meta[property="article:author"]')) issues[4].push("Article Author (FB)");

        // 5. IMAGES
        if (!check('meta[property="og:image"]')) issues[5].push("OG Image");
        if (!check('meta[name="twitter:image"]')) issues[5].push("Twitter Image");

        const images = document.querySelectorAll('img');
        let noAltCount = 0;
        images.forEach(img => {
            if (!img.getAttribute('alt')) noAltCount++;
        });
        if (noAltCount > 0) issues[5].push(`${noAltCount} Image(s) missing Alt text`);

        // 6. ASSETS
        if (!check('link[type="application/rss+xml"]')) issues[6].push("RSS Feed Link");
        if (!check('script[type="application/ld+json"]')) issues[6].push("Schema JSON-LD");
        if (!check('meta[name="description"]')) issues[6].push("Meta Description");

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
