import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const HTML_DIR = "artikel";
const RELATED_DIR = "api/v1/related";
const MAX = 6;

/* ================== UTIL ================== */

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function hasRelatedBlock(html) {
  return html.includes("<!-- RELATED:START -->");
}

function injectBeforeEnd(html, block) {
  return html.replace(/<\/article>|<\/main>|<\/div>\s*<\/div>/i, m => block + "\n" + m);
}

/* ================== HTML BLOCK ================== */

function buildAside(related) {
  const items = related.map(r =>
    `<li><a href="${r.url}">${r.title}</a></li>`
  ).join("\n");

  return `
<!-- RELATED:START -->
<aside class="related-articles">
  <h3>Artikel Terkait</h3>
  <ul>
${items}
  </ul>
</aside>
<!-- RELATED:END -->
`.trim();
}

/* ================== JSON-LD PATCH ================== */

function injectJSONLD(html, related) {
  const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i;
  const m = html.match(re);
  if (!m) return html;

  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return html;
  }

  if (data.relatedLink) return html;

  data.relatedLink = related.map(r => r.url);

  const patched =
    `<script type="application/ld+json">\n` +
    JSON.stringify(data, null, 2) +
    `\n</script>`;

  return html.replace(m[0], patched);
}

/* ================== MAIN ================== */

let injected = 0;
let skipped = 0;

for (const file of fs.readdirSync(HTML_DIR)) {
  if (!file.endsWith(".html")) continue;

  const slug = file.replace(".html", "");
  const relatedPath = path.join(RELATED_DIR, `${slug}.json`);
  const htmlPath = path.join(HTML_DIR, file);

  if (!fs.existsSync(relatedPath)) {
    skipped++;
    continue;
  }

  let html = fs.readFileSync(htmlPath, "utf8");
  if (hasRelatedBlock(html)) {
    skipped++;
    continue;
  }

  const relatedData = loadJSON(relatedPath);
  if (!relatedData.related || !relatedData.related.length) {
    skipped++;
    continue;
  }

  const related = relatedData.related.slice(0, MAX);

  // inject aside
  const aside = buildAside(related);
  html = injectBeforeEnd(html, aside);

  // inject schema
  html = injectJSONLD(html, related);

  fs.writeFileSync(htmlPath, html);
  injected++;
}

/* ================== SUMMARY ================== */

console.log("✔ Related injection complete");
console.log(`• Injected : ${injected}`);
console.log(`• Skipped  : ${skipped}`);
