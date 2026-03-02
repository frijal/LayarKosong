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
            let rawContent = await readFile(filePath, "utf-8");

            // STRATEGI ANTI-CRASH:
            // Kita "sunat" isinya. Hapus semua teks di dalam <style>...</style> dan <script>...</script>
            // supaya parser CSS/JS Happy-DOM tidak aktif dan tidak memicu SyntaxError.
            const cleanContent = rawContent
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '<style></style>')
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '<script></script>');

            const window = new Window({
                settings: {
                    disableCSSFileLoading: true,
                    disableJavaScriptFileLoading: true,
                    disableJavaScriptEvaluation: true
                }
            });

            const document = window.document;

            // Gunakan innerHTML pada documentElement agar lebih stabil daripada document.write
            document.documentElement.innerHTML = cleanContent;

            const issues: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

            // Ambil tag secara primitif (Metode paling stabil)
            const allMetas = Array.from(document.getElementsByTagName('meta'));
            const allLinks = Array.from(document.getElementsByTagName('link'));
            const allImgs = Array.from(document.getElementsByTagName('img'));

            // Helper pencarian atribut (Anti-Crash)
            const hasMeta = (attr: string, value: string, isProperty = false) =>
            allMetas.some(m => m.getAttribute(isProperty ? 'property' : 'name') === value);

            const hasLink = (rel: string) => allLinks.some(l => l.getAttribute('rel') === rel);

            // --- EKSEKUSI AUDIT ---
            if (!hasLink('canonical')) issues[1].push("Canonical Tag");
            if (!hasLink('icon')) issues[1].push("Favicon.ico");
            if (!hasMeta('name', 'author')) issues[1].push("Author");
            if (!hasMeta('name', 'theme-color')) issues[1].push("Theme Color");

            // OG & Social
            if (!hasMeta('property', 'og:site_name', true)) issues[3].push("OG Site Name");
            if (!hasMeta('name', 'twitter:card')) issues[4].push("Twitter Card");

            // Alt Text Gambar
            let noAltCount = 0;
            for (const img of allImgs) {
                if (!img.getAttribute('alt')) noAltCount++;
            }
            if (noAltCount > 0) issues[5].push(`${noAltCount} Image(s) tanpa Alt text`);

            // Simpan hasil
            for (let i = 1; i <= 6; i++) {
                if (issues[i].length > 0) {
                    results[i].push(`| \`${filePath}\` | ${issues[i].join("<br>")} |`);
                }
            }
        } catch (fileError) {
            console.error(`⚠️ Gagal total di ${filePath}:`, fileError.message);
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
