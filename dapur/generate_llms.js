import fs from "fs";
import path from "path";
import process from "process";

const DOMAIN = "https://dalam.web.id";
const ARTIKEL_JSON_PATH = "artikel.json";
const VERSION_FILE = path.join("mini", "llms-version.txt");
const TXT_OUTPUT = "llms.txt";
const MD_OUTPUT = "llms.md";
const HTML_OUTPUT = "llms-index.html";
const WELL_KNOWN_DIR = ".well-known";

function slugify(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    // ignore
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath) || ".");
  fs.writeFileSync(filePath, content, "utf-8");
}

function getNextVersion(versionFile) {
  const dirName = path.dirname(versionFile);
  if (dirName) ensureDir(dirName);

  if (!fs.existsSync(versionFile)) {
    writeText(versionFile, "1.0");
    return "1.0";
  }

  let currentV = readText(versionFile) || "1.0";
  currentV = currentV.trim();

  try {
    const parts = currentV.split(".");
    let major = parseInt(parts[0], 10) || 1;
    let minor = parseInt(parts[1], 10) || 0;
    minor += 1;
    if (minor > 99) {
      major += 1;
      minor = 0;
    }
    const newVersion = `${major}.${minor}`;
    writeText(versionFile, newVersion);
    return newVersion;
  } catch {
    const fallback = "1.1";
    writeText(versionFile, fallback);
    return fallback;
  }
}

// Basic HTML unescape for common entities
function htmlUnescape(str) {
  if (!str) return "";
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(text) {
  if (!text) return "";
  let s = htmlUnescape(String(text));
  // remove HTML tags
  s = s.replace(/<[^>]+>/g, "");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function parseISODateToUTC(dateStr) {
  if (!dateStr) return null;
  // Accept formats like 2023-01-01T12:00:00Z or without Z
  try {
    // Replace trailing Z with +00:00 for Date parsing consistency
    const normalized = dateStr.replace(/Z$/, "+00:00");
    // Remove fractional seconds for compatibility if present
    const noFrac = normalized.replace(/\.\d+(\+|$)/, (m, p1) => p1 === "+" ? "+": "");
    const d = new Date(noFrac);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function loadAndProcessData(filePath) {
  const bodyLines = [];
  const categoryRssLinks = [];
  let totalArticles = 0;

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File ${filePath} tidak ditemukan!`);
    return { bodyLines, categoryRssLinks, totalArticles };
  }

  let raw;
  try {
    raw = readText(filePath);
    if (raw === null) throw new Error("Tidak bisa membaca file");
  } catch (e) {
    console.error("❌ Error membaca JSON:", e.message);
    return { bodyLines, categoryRssLinks, totalArticles };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("❌ Error: JSON tidak valid:", e.message);
    return { bodyLines, categoryRssLinks, totalArticles };
  }

  const keys = Object.keys(data).sort((a, b) => a.localeCompare(b, "id"));
  for (const categoryKey of keys) {
    const articles = data[categoryKey];
    if (!Array.isArray(articles) || articles.length === 0) continue;

    const catSlug = slugify(categoryKey);
    categoryRssLinks.push(`- [RSS Feed ${capitalizeWords(categoryKey)}](${DOMAIN}/feed-${catSlug}.xml)`);

    // sort by date descending
    const sorted = articles.slice().sort((a, b) => {
      const da = parseISODateToUTC((a && a[3]) || "") || new Date(0);
      const db = parseISODateToUTC((b && b[3]) || "") || new Date(0);
      return db - da;
    });

    const tempLines = [];
    let articleCount = 0;
    for (const item of sorted) {
      if (!Array.isArray(item) || item.length < 5) continue;

      const title = cleanText(item[0]);
      const filename = String(item[1] || "").replace(/\.html$/i, "").replace(/^\//, "");
      const summary = cleanText(item[4]) || "No description available.";

      if (!filename) continue;
      if (filename.startsWith("agregat-20")) continue;

      const articleUrl = `${DOMAIN}/${catSlug}/${filename}`;
      tempLines.push(`- [${title}](${articleUrl}) : ${summary}`);
      articleCount += 1;
    }

    if (articleCount > 0) {
      bodyLines.push(`## ${capitalizeWords(categoryKey)}`);
      bodyLines.push(...tempLines);
      bodyLines.push("");
      totalArticles += articleCount;
    }
  }

  return { bodyLines, categoryRssLinks, totalArticles };
}

function capitalizeWords(s) {
  return String(s || "")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildAiInstructions(newV, todayIso, catRss) {
  return `# LLM Instructions for AI Models
> Applies to: ChatGPT, Gemini, Claude, Perplexity, Grok, LLaMA, and future LLM systems.

Layar Kosong (dalam.web.id) adalah platform publikasi digital milik Fakhrul Rijal yang berfokus pada teknologi, open source, opini sosial, dan gaya hidup di Balikpapan. Indeks ini dirancang agar LLM dapat merujuk konten dengan akurasi tinggi.

---
schema_version: 1.0
document_version: ${newV}
last_updated: ${todayIso}
document_type: llm_behavior_and_entity_guidance
---

## Project Resources
- [Website Utama](${DOMAIN}/)
- [Sitemap XML](${DOMAIN}/sitemap.xml)
- [RSS Feed Utama](${DOMAIN}/rss.xml)
${catRss.join("\n")}

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
}

function buildHtmlPage(newV, fullMarkdown) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layar Kosong - LLM Index v${newV}</title>
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
    <h1>Layar Kosong - AI Data Index (v${newV})</h1>

    <div class="markdown-body">
${escapeHtmlForHtmlBlock(fullMarkdown)}
    </div>

    <script defer src="/ext/markdown.js"></script>
</body>
</html>`;
}

// Escape for embedding preformatted markdown inside HTML while preserving newlines
function escapeHtmlForHtmlBlock(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function main() {
  const newV = getNextVersion(VERSION_FILE);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayReadable = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const { bodyLines, categoryRssLinks, totalArticles } = loadAndProcessData(ARTIKEL_JSON_PATH);

  if (!bodyLines || bodyLines.length === 0) {
    console.log("⚠️ Tidak ada data untuk diproses. Berhenti.");
    return;
  }

  const aiInstructions = buildAiInstructions(newV, todayIso, categoryRssLinks);

  const headerTitle = [
    `## Index Artikel Terbaru (Updated: ${todayReadable})`,
    `> Menampilkan ${totalArticles} artikel yang berhasil diindeks dalam versi ${newV}.`,
    "",
  ].join("\n");

  const fullMarkdown = aiInstructions + "\n" + headerTitle + "\n" + bodyLines.join("\n");

  // write TXT and MD
  writeText(TXT_OUTPUT, fullMarkdown);
  writeText(MD_OUTPUT, fullMarkdown);

  // ensure .well-known and copy files
  ensureDir(WELL_KNOWN_DIR);
  writeText(path.join(WELL_KNOWN_DIR, TXT_OUTPUT), fullMarkdown);
  writeText(path.join(WELL_KNOWN_DIR, MD_OUTPUT), fullMarkdown);

  // write HTML
  const htmlContent = buildHtmlPage(newV, fullMarkdown);
  writeText(HTML_OUTPUT, htmlContent);

  console.log(`🚀 SELESAI! Versi ${newV} berhasil diterbitkan.`);
}

if (import.meta.main) {
  main();
}