// Modular Sitemap & Article Generator
// Semua modul digabung dalam satu file untuk kompatibilitas canvas
// Struktur modular dengan namespace-style objek

// ================================
// 📦 CONFIG MODULE
// ================================
export const CONFIG = {
  rootDir: "./",
  artikelDir: "./artikel",
  masterJson: "./artikel/artikel.json",
  jsonOut: "./artikel.json",
  xmlOut: "./sitemap.xml",
  baseUrl: "https://frijal.pages.dev",
  defaultThumbnail: "https://frijal.pages.dev/thumbnail.webp",
  xmlPriority: "0.6",
  xmlChangeFreq: "monthly"
};


// ================================
// 🧰 FILE I/O MODULE
// ================================
import fs from "fs/promises";
import path from "path";

export const FileIO = {
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },

  read(filePath) {
    return fs.readFile(filePath, "utf8");
  },

  write(filePath, data) {
    return fs.writeFile(filePath, data, "utf8");
  },

  listHtml(dir) {
    return fs.readdir(dir).then((files) => files.filter((f) => f.endsWith(".html")));
  }
};


// ================================
// 🧩 HTML PARSER MODULE
// ================================
export const HtmlParser = {
  extractTitle(content) {
    const m = content.match(/<title>([\s\S]*?)<\/title>/i);
    return m ? m[1].trim() : "Tanpa Judul";
  },

  extractDescription(content) {
    const m = content.match(/<meta name=\"description\"[^>]+content=\"([^\"]+)\"/i);
    return m ? m[1].trim() : "";
  },

  extractImage(content, fallback) {
    const og = content.match(/<meta[^>]+property=\"og:image\"[^>]+content=\"(.*?)\"/i);
    if (og && og[1]) return og[1];
    const img = content.match(/<img[^>]+src=\"(.*?)\"/i);
    if (img && img[1]) return img[1];
    return fallback;
  },

  extractPubDate(content) {
    const m = content.match(/<meta property=\"article:published_time\"[^>]+content=\"([^\"]+)\"/i);
    return m ? m[1].trim() : null;
  },

  fixTitle(content) {
    return content.replace(/<title>([\s\S]*?)<\/title>/gi, (m, p1) => `<title>${p1.trim()}</title>`);
  }
};


// ================================
// 🗂️ CATEGORY MODULE
// ================================
import { titleToCategory } from "./titleToCategory.js";

export const Category = {
  fromTitle(title) {
    return titleToCategory(title);
  }
};


// ================================
// ⏱️ DATE & XML UTIL MODULE
// ================================
export const Util = {
  iso(date) {
    const d = new Date(date);
    if (isNaN(d)) return new Date().toISOString();
    return d.toISOString();
  },

  escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
};


// ================================
// 📝 JSON OUTPUT MODULE
// ================================
export const JsonOutput = {
  format(obj) {
    return JSON.stringify(obj, null, 2);
  }
};


// ================================
// 🗺️ SITEMAP GENERATOR MODULE
// ================================
export const Sitemap = {
  generate(grouped) {
    const entries = [];

    Object.values(grouped).flat().forEach(([title, file, image, lastmod]) => {
      entries.push(
`  <url>
    <loc>${Util.escapeXml(`${CONFIG.baseUrl}/artikel/${file}`)}</loc>
    <lastmod>${Util.escapeXml(lastmod)}</lastmod>
    <changefreq>${CONFIG.xmlChangeFreq}</changefreq>
    <priority>${CONFIG.xmlPriority}</priority>
    <image:image>
      <image:loc>${Util.escapeXml(image)}</image:loc>
    </image:image>
  </url>`
      );
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")} 
</urlset>`;
  }
};


// ================================
// 📄 CATEGORY PAGE GENERATOR MODULE
// ================================
export const CategoryPages = {
  async generate(grouped) {
    const kategoriDir = path.join(CONFIG.artikelDir, "-");
    const templatePath = path.join(kategoriDir, "template-kategori.html");

    if (!(await FileIO.exists(templatePath))) return;

    const template = await FileIO.read(templatePath);

    for (const category in grouped) {
      const slug = category
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, "")
        .replace(/\s+/g, "-");

      const url = `${CONFIG.baseUrl}/artikel/-/${slug}.html`;
      const rss = `${CONFIG.baseUrl}/feed-${slug}.xml`;

      const page = template
        .replace(/%%TITLE%%/g, category)
        .replace(/%%DESCRIPTION%%/g, `topik ${category}`)
        .replace(/%%CANONICAL_URL%%/g, url)
        .replace(/%%CATEGORY_NAME%%/g, category)
        .replace(/%%ICON%%/g, "📁")
        .replace(/%%RSS_URL%%/g, rss);

      await FileIO.write(path.join(kategoriDir, `${slug}.html`), page);
    }
  }
};


// ================================
// 🚀 MAIN MODULE
// ================================
export async function generate() {
  console.log("🚀 Memulai generator...");

  if (!(await FileIO.exists(CONFIG.artikelDir))) {
    console.error("❌ Folder artikel tidak ditemukan");
    return;
  }

  const htmlFiles = await FileIO.listHtml(CONFIG.artikelDir);
  let grouped = {};

  if (await FileIO.exists(CONFIG.masterJson)) {
    grouped = JSON.parse(await FileIO.read(CONFIG.masterJson));
  }

  const known = new Set(Object.values(grouped).flat().map((x) => x[1]));
  const newArticles = [];

  for (const file of htmlFiles) {
    if (known.has(file)) continue;

    const full = path.join(CONFIG.artikelDir, file);
    let content = await FileIO.read(full);
    content = HtmlParser.fixTitle(content);

    const title = HtmlParser.extractTitle(content);
    const desc = HtmlParser.extractDescription(content);
    const img = HtmlParser.extractImage(content, CONFIG.defaultThumbnail);

    let pub = HtmlParser.extractPubDate(content);

    if (!pub) {
      const stat = await fs.stat(full);
      pub = Util.iso(stat.mtime);
      content = content.replace("</head>", `    <meta property=\"article:published_time\" content=\"${pub}\">\n</head>`);
      await FileIO.write(full, content);
    }

    const cat = Category.fromTitle(title);
    if (!grouped[cat]) grouped[cat] = [];

    grouped[cat].push([title, file, img, pub, desc]);
    newArticles.push(file);
  }

  for (const cat in grouped) {
    grouped[cat].sort((a, b) => new Date(b[3]) - new Date(a[3]));
  }

  await FileIO.write(CONFIG.jsonOut, JsonOutput.format(grouped));
  await FileIO.write(CONFIG.xmlOut, Sitemap.generate(grouped));

  await CategoryPages.generate(grouped);

  console.log("✅ Selesai!", newArticles.length, "artikel baru diproses.");
}

generate();
