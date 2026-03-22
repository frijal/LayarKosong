import { file, write } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";

// ========== TYPES ==========
type ArticleEntry = [string, string, string, string, string?];
type ArtikelData = Record<string, ArticleEntry[]>;

// ========== CONFIG ==========
const BASE_URL    = "https://dalam.web.id";
const SITE_NAME   = "Layar Kosong";
const AUTHOR      = "Fakhrul Rijal";
const LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/";

const ALLOWED_CATEGORIES = new Set([
  "gaya-hidup", "jejak-sejarah", "lainnya",
  "olah-media", "opini-sosial", "sistem-terbuka", "warta-tekno",
]);

const SCHEMA_REGEX  = /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi;
const SIGNATURE_KEY = "schema_oleh_Fakhrul_Rijal";
const STOPWORDS     = new Set([
  "yang", "untuk", "dengan", "adalah", "dalam", "dari",
  "pada", "atau", "itu", "dan", "sebuah", "aku", "ke",
  "saya", "ini", "gue", "gua", "elu", "elo"
]);

// ========== UTILITIES ==========

// Sinkron dengan slug() di diet.ts — handle emoji & karakter spesial
const slugify = (t: unknown): string =>
  String(t).toString().toLowerCase().trim()
    .replace(/^[^\w\s]*/u, '')
    .replace(/ & /g, '-and-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const categoryNameClean = (c: string): string =>
  String(c).trim()
    .replace(/^[^\w\s]*/u, '')   // hapus emoji di awal
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

function buildKeywords(headline: string, category: string, slug: string): string {
  const words = String(headline || "")
    .toLowerCase()
    .split(/[^\w]+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));

  const base = new Set<string>(words);
  base.add(String(category).toLowerCase());
  slug.split("-").forEach(s => { if (s.length > 3) base.add(s); });
  base.add("layar kosong");

  return Array.from(base).slice(0, 12).join(", ");
}

function buildCombinedSchema(category: string, article: ArticleEntry): string {
  const [headline, filename, image, iso_date, desc] = article;

  const catSlug       = slugify(category);
  const fileSlug      = String(filename).replace(/\.html$/i, "").replace(/^\//, "");
  const cleanBase     = BASE_URL.replace(/\/+$/, "");
  const articleUrl    = `${cleanBase}/${catSlug}/${fileSlug}`;
  const catDisplayName = categoryNameClean(category);

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${cleanBase}/#website`,
        "url": cleanBase,
        "name": SITE_NAME,
        "publisher": {
          "@type": "Organization",
          "@id": `${cleanBase}/#organization`,
          "name": SITE_NAME,
          "url": cleanBase,
          "logo": { "@type": "ImageObject", "url": `${cleanBase}/logo.png` }
        }
      },
      {
        "@type": "Article",
        "@id": `${articleUrl}#article`,
        "isPartOf": { "@id": `${cleanBase}/#website` },
        "mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl },
        "headline": headline,
        "description": desc || headline,
        "articleSection": catDisplayName,
        "keywords": buildKeywords(headline, catDisplayName, fileSlug),
        "image": {
          "@type": "ImageObject",
          "url": image || `${cleanBase}/logo.png`,
          "width": 384,
          "height": 384
        },
        "author": {
          "@type": "Person",
          "name": AUTHOR,
          "url": `${cleanBase}/about`,
          "sameAs": [`${cleanBase}/about`]
        },
        "datePublished": iso_date,
        "dateModified": iso_date,
        "license": LICENSE_URL
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${articleUrl}#breadcrumb`,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Beranda",       "item": cleanBase },
          { "@type": "ListItem", "position": 2, "name": catDisplayName,  "item": `${cleanBase}/${catSlug}` },
          { "@type": "ListItem", "position": 3, "name": headline,        "item": articleUrl }
        ]
      },
      {
        "@type": "ItemList",
        "@id": `${cleanBase}/#footer-nav`,
        "name": "Navigasi Legal",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Privacy & Legal Info", "item": `${cleanBase}/privacy` },
          { "@type": "ListItem", "position": 2, "name": "Disclaimer",           "item": `${cleanBase}/disclaimer` },
          { "@type": "ListItem", "position": 3, "name": "About",                "item": `${cleanBase}/about` },
          { "@type": "ListItem", "position": 4, "name": "Security Policy",      "item": `${cleanBase}/security-policy` },
          { "@type": "ListItem", "position": 5, "name": "Lisensi",              "item": `${cleanBase}/lisensi` }
        ]
      }
    ]
  };

  return `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>\n`;
}

// ========== MAIN ==========
async function main() {
  try {
    const data: ArtikelData = await file("artikel.json").json();
    const results = { changed: 0, skipped: 0, missing: 0 };
    const signature = `<noscript>${SIGNATURE_KEY}_${new Date().toISOString().slice(0, 10)}</noscript>`;

    for (const [category, articles] of Object.entries(data)) {
      const catSlug = slugify(category);

      if (!ALLOWED_CATEGORIES.has(catSlug) || !Array.isArray(articles)) continue;

      for (const article of articles) {
        const htmlPath = path.join(catSlug, String(article[1]).replace(/^\//, ""));

        if (!existsSync(htmlPath)) {
          results.missing++;
          console.warn(`⚠️  File tidak ditemukan: ${htmlPath}`);
          continue;
        }

        let html = await file(htmlPath).text();

        // Skip jika sudah ada signature — artikel sudah pernah diproses
        if (html.includes(SIGNATURE_KEY)) {
          results.skipped++;
          continue;
        }

        // 1. Bersihkan schema lama
        html = html.replace(SCHEMA_REGEX, "");

        // 2. Build schema baru
        const schema = buildCombinedSchema(category, article);

        // 3. Injeksi schema — prioritas: sebelum <style>, lalu </head>, lalu prepend
        if (/<style/i.test(html)) {
          html = html.replace(/<style/i, `${schema}<style`);
        } else if (/<\/head>/i.test(html)) {
          html = html.replace(/<\/head>/i, `${schema}</head>`);
        } else {
          html = schema + html;
        }

        // 4. Injeksi signature di akhir file — rapat ke </html>
        if (html.includes('</body>')) {
          html = html.replace(/<\/body>\s*$/i, '').trimEnd() + `${signature}</body>`;
        } else {
          html = html.trimEnd() + signature;
        }

        // 5. Tulis balik ke file
        await write(htmlPath, html);

        results.changed++;
        console.log(`✅ Injected: ${htmlPath}`);
      }
    }

    console.log(`
🚀 SEO Injection Selesai!
🆕 Baru diproses : ${results.changed}
⏭️  Di-skip        : ${results.skipped}
❌ File hilang    : ${results.missing}`);

  } catch (err) {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  }
}

main();