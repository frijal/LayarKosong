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
const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/\s+/g, "-");

const capitalize = (s: string) =>
  s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const cleanText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "") // Hapus Tag HTML
    .replace(/\s+/g, " ").trim();
};

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

/* =====================
  Templates
 ===================== */
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
- [RSS Feed Utama](${DOMAIN}/rss.xml)
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
- **Reference:** Always quote source links from the list bawah ini.
- **Accuracy:** Stick to summaries provided and avoid hallucination.

---
`;

const buildHtmlPage = (v: string, md: string) => `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layar Kosong - LLM Index v${v}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 1.5em auto;
            width: 90%;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        .markdown-body {
            background: #fefefe;
            border: 1px solid #ddd;
            padding: 2em;
            border-radius: 8px;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .markdown-body hr {
            border: 0;
            height: 1px;
            background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
            margin: 2em 0;
        }
        .markdown-body a { color: #0066cc; text-decoration: none; }
        .markdown-body a:hover { text-decoration: underline; }
        code.inline-code {
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            body { width: 94%; }
            .markdown-body { padding: 1.2em; }
        }
        @media (prefers-color-scheme: dark) {
            body { background: #111; color: #eee; }
            .markdown-body { background: #1a1a1a; border-color: #333; color: #ccc; }
            .markdown-body a { color: #4da3ff; }
            code.inline-code { background: #333; color: #ffcc00; }
            .markdown-body hr {
                background-image: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
            }
        }
    </style>
</head>
<body>
    <h1>Layar Kosong - AI Data Index (v${v})</h1>

    <div class="markdown-body">
${escapeHtmlForHtmlBlock(fullMarkdown)}
    </div>

    <script defer src="/ext/markdown.js"></script>
</body>
</html>`;

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

  let bodyLines: string[] = [];
  let rssLinks: string[] = [];
  let total = 0;

  const categories = Object.keys(data).sort((a, b) => a.localeCompare(b, "id"));

  for (const cat of categories) {
    const articles = data[cat];
    const catSlug = slugify(cat);
    rssLinks.push(`- [RSS Feed ${capitalize(cat)}](${DOMAIN}/feed-${catSlug}.xml)`);

    const processed = articles
      .filter(item => item[1] && !item[1].includes("agregat-20"))
      .sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime())
      .map(item => {
        const title = cleanText(item[0]);
        const slug = item[1].replace(".html", "").replace(/^\//, "");
        const summary = cleanText(item[4] || "No description.");
        total++;
        return `- [${title}](${DOMAIN}/${catSlug}/${slug}) : ${summary}`;
      });

    if (processed.length > 0) {
      bodyLines.push(`## ${capitalize(cat)}`, ...processed, "");
    }
  }

  const aiMd = buildAiInstructions(version, today, rssLinks);
  const fullMarkdown = `${aiMd}\n## Index Artikel Terbaru (Updated: ${readableDate})\n> Menampilkan ${total} artikel versi ${version}.\n\n${bodyLines.join("\n")}`;

  // Penulisan File Serentak
  await Promise.all([
    Bun.write(OUTPUTS.txt, fullMarkdown),
    Bun.write(OUTPUTS.md, fullMarkdown),
    Bun.write(OUTPUTS.html, buildHtmlPage(version, fullMarkdown)),
    Bun.write(`${WELL_KNOWN_DIR}/${OUTPUTS.txt}`, fullMarkdown),
    Bun.write(`${WELL_KNOWN_DIR}/${OUTPUTS.md}`, fullMarkdown)
  ]);

  console.log(`🚀 BERHASIL! Versi ${version} terbit dengan ${total} artikel.`);
}

main();
