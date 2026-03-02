import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { glob } from "glob";

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
    console.log("🚀 Memulai Audit SEO ala Bun (Stability Mode)...");
    const results: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    const files = await glob(`./{${FOLDERS.join(",")}}/**/*.html`, { recursive: true });

    for (const filePath of files) {
        try {
            const content = await readFile(filePath, "utf-8");

            // KONFIGURASI PENTING: Matikan semua fitur yang tidak perlu
            const window = new Window({
                settings: {
                    disableCSSFileLoading: true,   // JANGAN download file CSS
                    disableJavaScriptFileLoading: true, // JANGAN download JS
                    disableJavaScriptEvaluation: true,  // JANGAN jalankan JS
                    disableComputedStyle: true,    // JANGAN hitung style CSS
                }
            });

            const document = window.document;

            // Kita masukkan konten secara bertahap agar tidak memicu fetch otomatis
            document.write(content);

            const issues: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };



            // Ambil semua tag sekaligus agar hemat resource
            const allMetas = Array.from(document.getElementsByTagName('meta'));
            const allLinks = Array.from(document.getElementsByTagName('link'));
            const allScripts = Array.from(document.getElementsByTagName('script'));
            const allImgs = Array.from(document.getElementsByTagName('img'));

            // Helper pencarian atribut manual (Anti-Crash)
            const hasMeta = (attr: string, value: string, isProperty = false) =>
            allMetas.some(m => m.getAttribute(isProperty ? 'property' : 'name') === value);

            const hasLink = (rel: string) => allLinks.some(l => l.getAttribute('rel') === rel);

            // 1. CORE
            if (!hasLink('canonical')) issues[1].push("Canonical Tag");
            if (!hasLink('icon')) issues[1].push("Favicon.ico");
            if (!hasMeta('name', 'author')) issues[1].push("Author");
            if (!hasMeta('name', 'theme-color')) issues[1].push("Theme Color");

            // 2. SOCIAL
            if (!hasMeta('name', 'fediverse:creator')) issues[2].push("Fediverse Creator");
            if (!hasMeta('name', 'twitter:creator')) issues[2].push("Twitter Creator");
            if (!hasMeta('name', 'bluesky:creator')) issues[2].push("Bluesky Creator");

            // 3. OG (Property)
            if (!hasMeta('property', 'og:site_name', true)) issues[3].push("OG Site Name");
            if (!hasMeta('property', 'og:title', true)) issues[3].push("OG Title");

            // 4. TWITTER
            if (!hasMeta('name', 'twitter:card')) issues[4].push("Twitter Card");

            // 5. IMAGES & ALT
            if (!hasMeta('property', 'og:image', true)) issues[5].push("OG Image");

            let noAltCount = 0;
            for (const img of allImgs) {
                if (!img.getAttribute('alt')) noAltCount++;
            }
            if (noAltCount > 0) issues[5].push(`${noAltCount} Image(s) missing Alt text`);

            // 6. ASSETS
            if (!allScripts.some(s => s.getAttribute('type') === 'application/ld+json')) issues[6].push("Schema JSON-LD");
            if (!hasMeta('name', 'description')) issues[6].push("Meta Description");

            for (let i = 1; i <= 6; i++) {
                if (issues[i].length > 0) {
                    results[i].push(`| \`${filePath}\` | ${issues[i].join("<br>")} |`);
                }
            }
        } catch (fileError) {
            console.error(`⚠️ Gagal memproses ${filePath}:`, fileError.message);
        }
    }

    // Generate Report
    let report = `# 📋 Hasil Audit SEO Layar Kosong\n📅 Tanggal: ${new Date().toLocaleString('id-ID')}\n\n`;
    for (let i = 1; i <= 6; i++) {
        report += `<details>\n<summary><b>${TITLES[i]} (${results[i].length} Masalah)</b></summary>\n\n| File | Masalah |\n| :--- | :--- |\n${results[i].length > 0 ? results[i].join("\n") : "| - | ✅ Semua beres |"}\n\n</details>\n\n`;
    }

    await Bun.write(REPORT_PATH, report);
    console.log(`✅ Laporan sukses di ${REPORT_PATH}`);
}

auditSEO();
