import { parseHTML } from "linkedom";
import { Glob, file, write } from "bun";

// --- KONFIGURASI ---
const FOLDERS = ["gaya-hidup", "jejak-sejarah", "lainnya", "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno", "artikel"];
const DATE_STR = new Date().toISOString().split('T')[0].replace(/-/g, '');
const REPORT_PATH = `./mini/laporan-audit-${DATE_STR}.md`;

const TITLES: Record<number, string> = {
    1: "🏷️ Core Meta & Branding",
    2: "🌐 Social Meta & Creators",
    3: "📊 Open Graph (OG) Tags",
    4: "🐦 Twitter & Article Meta",
    5: "🖼️ Image Meta & Alt Text",
    6: "🛠️ Assets & Descriptions"
};

async function auditFile(filePath: string) {
    const issues: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const content = await file(filePath).text();
    const { document } = parseHTML(content);

    const checkMeta = (attr: 'name' | 'property' | 'itemprop', key: string, expectedValue?: string) => {
        const element = document.querySelector(`meta[${attr}="${key}"]`);
        if (!element) return false;
        return expectedValue ? element.getAttribute('content') === expectedValue : true;
    };

    const hasLink = (rel: string, href?: string) => !!document.querySelector(href ? `link[rel="${rel}"][href="${href}"]` : `link[rel="${rel}"]`);

    // --- LOGIKA AUDIT (Tetap sama) ---
    if (!hasLink('canonical')) issues[1].push("Canonical Tag");
    if (!hasLink('icon', '/favicon.ico')) issues[1].push("Favicon.ico");
    if (!checkMeta('name', 'author', 'Fakhrul Rijal')) issues[1].push("Author (Fakhrul Rijal)");
    if (!checkMeta('name', 'theme-color', '#00b0ed')) issues[1].push("Theme Color (#00b0ed)");
    if (!hasLink('license')) issues[1].push("CC0 License Link");
    if (!checkMeta('name', 'robots')) issues[1].push("Robots Meta");
    if (!checkMeta('name', 'googlebot')) issues[1].push("Googlebot Meta");

    if (!checkMeta('name', 'fediverse:creator')) issues[2].push("Fediverse Creator");
    if (!checkMeta('name', 'twitter:creator')) issues[2].push("Twitter Creator");
    if (!checkMeta('name', 'bluesky:creator')) issues[2].push("Bluesky Creator");

    if (!checkMeta('property', 'og:site_name')) issues[3].push("OG Site Name");
    if (!checkMeta('property', 'og:locale', 'id_ID')) issues[3].push("OG Locale (id_ID)");
    if (!checkMeta('property', 'og:type', 'article')) issues[3].push("OG Type Article");
    if (!checkMeta('property', 'og:url')) issues[3].push("OG URL");
    if (!checkMeta('property', 'og:title')) issues[3].push("OG Title");
    if (!checkMeta('property', 'fb:app_id')) issues[3].push("FB App ID");

    if (!checkMeta('name', 'twitter:card')) issues[4].push("Twitter Card");
    if (!checkMeta('name', 'twitter:site')) issues[4].push("Twitter Site");
    if (!checkMeta('property', 'article:author')) issues[4].push("Article Author (FB)");
    if (!checkMeta('property', 'article:publisher')) issues[4].push("Article Publisher (FB)");

    if (!checkMeta('property', 'og:image')) issues[5].push("OG Image");
    if (!checkMeta('property', 'og:image:width', '1200')) issues[5].push("OG Image Width (1200)");
    if (!checkMeta('name', 'twitter:image')) issues[5].push("Twitter Image");
    if (!checkMeta('itemprop', 'image')) issues[5].push("Itemprop Image");

    const imgsWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]');
    if (imgsWithoutAlt.length > 0) issues[5].push(`${imgsWithoutAlt.length} Image(s) missing Alt text`);

    if (!document.querySelector('link[type="application/rss+xml"]')) issues[6].push("RSS Feed Link");
    if (!document.querySelector('script[type="application/ld+json"]')) issues[6].push("Schema JSON-LD");
    if (!checkMeta('name', 'description')) issues[6].push("Meta Description");

    return { filePath, issues };
}

async function auditSEO() {
    console.log("🚀 Memulai Audit SEO Layar Kosong (Bun Native)...");

    const scanner = new Glob(`./{${FOLDERS.join(",")}}/**/*.html`);
    const files = await Array.fromAsync(scanner.scan());

    // Proses semua file secara paralel
    const results = await Promise.all(files.map(auditFile));

    // Kumpulkan hasil
    const reportData: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    results.forEach(({ filePath, issues }) => {
        for (let i = 1; i <= 6; i++) {
            if (issues[i].length > 0) {
                reportData[i].push(`| \`${filePath}\` | ${issues[i].join("<br>")} |`);
            }
        }
    });

    // Penulisan Laporan
    let report = `# 📋 Hasil Audit SEO Layar Kosong\n📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    for (let i = 1; i <= 6; i++) {
        const count = reportData[i].length;
        report += `<details>\n<summary><b>${TITLES[i]} (${count} Masalah)</b></summary>\n\n| File | Masalah Terdeteksi |\n| :--- | :--- |\n`;
        report += count > 0 ? reportData[i].join("\n") : "| - | ✅ Semua beres |";
        report += `\n\n</details>\n\n`;
    }

    await write(REPORT_PATH, report);
    console.log(`\n✨ Audit Selesai! Disimpan di: ${REPORT_PATH}`);
}

auditSEO();
