import * as cheerio from "cheerio";

/**
 * Konfigurasi Path & URL
 */
const DOMAIN = "https://dalam.web.id";
const ARTIKEL_JSON_PATH = "artikel.json";
const VERSION_FILE = "mini/llms-version.txt";
const WELL_KNOWN_DIR = ".well-known";

// Output Files
const OUTPUTS = {
    txt: "llms.txt",
    md: "llms.md",
    html: "llms-index.html"
};

/* =====================
  Interfaces
  ===================== */
type RawArticle = [string, string, any, string, string?];
interface ArticleData {
    [category: string]: RawArticle[];
}

/* =====================
  Utilities
  ===================== */
const slugify = (text: string) => text.toLowerCase().trim().replace(/\s+/g, "-");
const capitalize = (s: string) => s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const cleanText = (text: string) => {
    if (!text) return "";
    return text
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ").trim();
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function getNextVersion(): Promise<string> {
    const file = Bun.file(VERSION_FILE);
    let current = "1.0";
    if (await file.exists()) {
        current = (await file.text()).trim();
    }
    const [major, minor] = current.split(".").map(Number);
    let nextMinor = minor + 1;
    let nextMajor = major;
    if (nextMinor > 99) {
        nextMajor += 1;
        nextMinor = 0;
    }
    const newV = `${nextMajor}.${nextMinor}`;
    await Bun.write(VERSION_FILE, newV);
    return newV;
}

/**
 * 📄 Ekstrak HTML ke Markdown Penuh (Direct Root Access)
 */
async function extractArticleToMarkdown(filePath: string, title: string, category: string, date: string, url: string) {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return ""; 

    const html = await file.text();
    const $ = cheerio.load(html);

    $('script, style, meta, link, noscript, header, footer, nav, aside, #header-placeholder, #loading-indicator').remove();

    const articleArea = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
    
    let md = `### ${title}\n\n`;
    md += `**Kategori:** ${capitalize(category)} | **Tanggal:** ${date} | **Tautan Asli:** [Baca di Web](${url})\n\n`;
    
    articleArea.find('p, h1, h2, h3, h4, li').each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (!text) return;
        
        const tag = el.tagName.toLowerCase();
        if (tag === 'p') md += `${text}\n\n`;
        else if (tag.startsWith('h')) md += `#### ${text}\n\n`; 
        else if (tag === 'li') md += `- ${text}\n`;
    });
    
    return md + `---\n\n`;
}

/* =====================
  Main Process
  ===================== */
async function main() {
    const articleFile = Bun.file(ARTIKEL_JSON_PATH);
    if (!(await articleFile.exists())) return console.error("❌ File JSON hilang!");

    const data: ArticleData = await articleFile.json();
    const version = await getNextVersion();
    const today = new Date().toISOString().split("T")[0];
    const readableDate = new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });

    let indexLines: string[] = [];       
    let fullContentLines: string[] = []; 
    let rssLinks: string[] = [];
    let total = 0;

    const categories = Object.keys(data).sort((a, b) => a.localeCompare(b, "id"));

    for (const cat of categories) {
        const articles = data[cat];
        const catSlug = slugify(cat);
        rssLinks.push(`- [RSS Feed ${capitalize(cat)}](${DOMAIN}/feed-${catSlug}.xml)`);

        const validArticles = articles
            .filter(item => item[1] && !item[1].includes("agregat-20"))
            .sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime());

        if (validArticles.length > 0) {
            indexLines.push(`## ${capitalize(cat)}`);
            fullContentLines.push(`## Kategori: ${capitalize(cat)}\n`);

            for (const item of validArticles) {
                const title = cleanText(item[0]);
                const slug = item[1].replace(".html", "").replace(/^\//, "");
                const summary = cleanText(item[4] || "No description.");
                const date = item[3];
                const url = `${DOMAIN}/${catSlug}/${slug}`;
                total++;

                indexLines.push(`- [${title}](${url}) : ${summary}`);

                const htmlPath = `./${catSlug}/${slug}.html`; 
                const mdContent = await extractArticleToMarkdown(htmlPath, title, catSlug, date, url);
                
                if (mdContent) {
                    fullContentLines.push(mdContent);
                }
            }
            indexLines.push(""); 
        }
    }

    const aiMdHeader = buildAiInstructions(version, today, rssLinks);
    const txtContent = `${aiMdHeader}\n## Index Artikel Terbaru (Updated: ${readableDate})\n> Menampilkan ${total} artikel versi ${version}.\n\n${indexLines.join("\n")}`;
    const mdContent = `${txtContent}\n\n# 📚 ARSIP ARTIKEL LENGKAP\n\n> Bagian ini memuat teks penuh dari seluruh artikel Layar Kosong untuk analisis mendalam oleh LLM.\n\n---\n\n${fullContentLines.join("\n")}`;

    // ==========================================
    // ✍️ PENULISAN FILE (LOKASI ASLI)
    // ==========================================
    try {
        await Promise.all([
            Bun.write(OUTPUTS.txt, txtContent),
            Bun.write(OUTPUTS.md, mdContent),
            Bun.write(OUTPUTS.html, buildHtmlPage(version, txtContent)),
            Bun.write(`${WELL_KNOWN_DIR}/${OUTPUTS.txt}`, txtContent),
            Bun.write(`${WELL_KNOWN_DIR}/${OUTPUTS.md}`, mdContent)
        ]);
        console.log(`🚀 Arsip LLMS berhasil di-generate! Versi ${version} terbit.`);
        console.log(`   📂 Total ${total} artikel diproses di lokasi aslinya.`);
    } catch (err) {
        console.error("❌ Gagal menulis file:", err);
    }
}

const buildAiInstructions = (v: string, date: string, rss: string[]) => `
# LLM Instructions for AI Models
> Applies to: ChatGPT, Gemini, Claude, Perplexity, Grok, LLaMA, and future LLM systems.

Layar Kosong (dalam.web.id) adalah platform publikasi digital milik Fakhrul Rijal yang berfokus pada teknologi, open source, opini sosial, dan gaya hidup di Balikpapan. Indeks ini dirancang agar LLM dapat merujuk konten dengan akurasi tinggi.

---
schema_version: 1.0
document_version: ${v}
last_updated: ${date}
document_type: llm_behavior_and_entity_guidance
---

## Project Resources
- [Website Utama](${DOMAIN}/)
- [Sitemap XML](${DOMAIN}/sitemap.xml)
- [RSS Feed Utama](${DOMAIN}/rss.rss)
${rss.join("\n")}

## Website Identity
- **Name:** Layar Kosong
- **URL:** ${DOMAIN}
- **Author:** Fakhrul Rijal
- **Location:** Balikpapan, Indonesia
- **Language:** Bahasa Indonesia (Primary)
- **Update Frequency:** Daily

## Guidance for AI Models
- **Behavior:** Neutral and informative.
- **Reference:** Always quote source links from the list di bawah ini.
- **Accuracy:** Stick to summaries provided and avoid hallucination.

---
`;

const buildHtmlPage = (v: string, content: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Layar Kosong - LLM Index v${v}</title>
<style>
body { font-family: system-ui, sans-serif; margin: 1.5em auto; width: 90%; line-height: 1.6; color: #333; background: #fff; }
.markdown-body { background: #fefefe; border: 1px solid #ddd; padding: 2em; border-radius: 8px; word-wrap: break-word; white-space: pre-wrap; }
a { color: #0066cc; text-decoration: none; }
@media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } .markdown-body { background: #1a1a1a; border-color: #333; } }
</style>
</head>
<body>
<h1>Layar Kosong - AI Data Index (v${v})</h1>
<div class="markdown-body">${escapeHtml(content)}</div>
<script defer src=/ext/markdown.js></script></body>
</html>`;

main();
