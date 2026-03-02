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
            let content = await readFile(filePath, "utf-8");

            // STRATEGI ANTI-CRASH:
            // Hapus isi tag <style> dan <script> agar Happy-DOM tidak mencoba mem-parsing CSS/JS
            content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '<style></style>');
            content = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '<script></script>');

            const window = new Window({
                settings: {
                    disableCSSFileLoading: true,
                    disableJavaScriptFileLoading: true,
                    disableJavaScriptEvaluation: true
                }
            });

            const document = window.document;

            // Gunakan innerHTML pada elemen utama
            document.documentElement.innerHTML = content;

            const issues: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

            // Ambil tag secara primitif
            const allMetas = Array.from(document.getElementsByTagName('meta'));
            const allLinks = Array.from(document.getElementsByTagName('link'));
            const allImgs = Array.from(document.getElementsByTagName('img'));

            // Helper pencarian (tetap gunakan ini karena aman)
            const hasMeta = (attrName: string, attrValue: string, isProperty = false) =>
            allMetas.some(m => m.getAttribute(isProperty ? 'property' : 'name') === attrValue);

            const hasLink = (rel: string) => allLinks.some(l => l.getAttribute('rel') === rel);

            // --- MULAI AUDIT ---
            if (!hasLink('canonical')) issues[1].push("Canonical Tag");
            if (!hasLink('icon')) issues[1].push("Favicon.ico");
            if (!hasMeta('name', 'author')) issues[1].push("Author");

            // Cek Alt Text pada gambar
            let noAltCount = 0;
            for (const img of allImgs) {
                if (!img.getAttribute('alt')) noAltCount++;
            }
            if (noAltCount > 0) issues[5].push(`${noAltCount} Image(s) missing Alt text`);

            // ... (lanjutkan logika audit lainnya sesuai kebutuhan)

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
