import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const HTML_DIR = "artikel";
const JSON_DIR = "api/v1/post";
const REPORT_FILE =
  `mini/AuditInjectHTML-${new Date().toISOString().slice(0,10).replace(/-/g,"")}.md`;

/* ================== REPORT STATE ================== */

const report = {
  date: new Date().toISOString(),
  total: 0,
  updated: [],
  noChange: [],
  skippedJson: [],
  skippedSchema: [],
  quality: []
};

/* ================== UTIL ================== */

const esc = (s="") =>
  String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");

const normalizeToArray = v =>
  !v ? [] :
  Array.isArray(v) ? v.map(x=>String(x).trim()).filter(Boolean) :
  typeof v === "object" ? Object.values(v).map(x=>String(x).trim()).filter(Boolean) :
  [String(v).trim()];

const normalizeToString = (v, j=", ") => normalizeToArray(v).join(j);

/* ================== SCHEMA VALIDATOR ================== */

function validateSchema(json) {
  return (
    json &&
    typeof json.title === "string" &&
    typeof json.url === "string" &&
    typeof json.published_at === "string" &&
    typeof json.meta === "object"
  );
}

/* ================== HTML HELPERS ================== */

const extractMeta = (h,n) =>
  (h.match(new RegExp(`<meta[^>]+name=["']${n}["'][^>]+content=["']([^"']*)`,"i"))||[])[1];

const extractProp = (h,p) =>
  (h.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']*)`,"i"))||[])[1];

const remove = (h,r) => h.replace(r,"");

/* ================== DEDUPLICATOR ================== */

function dedupeMetaByKey(html, attr, prefix) {
  const re = new RegExp(`<meta\\s+${attr}="${prefix}[^"]*"[^>]*>`, "gi");
  const found = html.match(re);
  if (!found || found.length <= 1) return html;
  const last = found.pop();
  return html.replace(re,"").replace(/<\/head>/i,`${last}\n</head>`);
}

const strictPostDeduplicator = h =>
  dedupeMetaByKey(
    dedupeMetaByKey(
      dedupeMetaByKey(h,"property","og:"),
      "name","twitter:"
    ),
    "property","article:"
  );

/* ================== CANONICAL SANITY ================== */

function canonicalSanityCheck(html, url) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/gi;
  const found = html.match(re);
  if (!found || found.length <= 1) return html;
  const valid = found.find(x => x.includes(url));
  return valid
    ? html.replace(re,"").replace(/<\/head>/i,`${valid}\n</head>`)
    : html;
}

/* ================== WHITESPACE NORMALIZER ================== */

function normalizeHeadWhitespace(html) {
  const m = html.match(/<head[\s\S]*?<\/head>/i);
  if (!m) return html;
  const cleaned = m[0]
    .split("\n")
    .filter((l,i,a)=>!(l.trim()==="" && a[i-1]?.trim()===""))
    .join("\n")
    .replace(/\n{3,}/g,"\n\n");
  return html.replace(m[0], cleaned);
}

/* ================== QUALITY ================== */

function qualityScore(html) {
  const rules = [
    /name="description"/i,
    /rel="canonical"/i,
    /property="og:title"/i,
    /property="og:image"/i,
    /name="twitter:card"/i,
    /ld\+json/i,
    /news_keywords/i,
    /ai:summary/i
  ];
  const score = rules.filter(r=>r.test(html)).length;
  return { score, max: rules.length, percent: Math.round(score/rules.length*100) };
}

/* ================== PERIKSA KONDISI ================== */

function isHtmlAlreadyCompliant(html, json) {
  const meta = json.meta || {};

  const same = (a,b) =>
    String(a||"").trim() === String(b||"").trim();

  if (!same(extractProp(html,"og:title"), json.title)) return false;
  if (!same(extractMeta(html,"description"), meta.summary)) return false;
  if (!html.includes(`rel="canonical"`) || !html.includes(json.url)) return false;
  if (!same(extractProp(html,"og:image"), json.image)) return false;
  if (!same(
    extractMeta(html,"news_keywords"),
    normalizeToString(meta.keywords)
  )) return false;

  // JSON-LD Article sanity
  if (!/"@type"\s*:\s*"Article"/i.test(html)) return false;
  if (!new RegExp(`"headline"\\s*:\\s*"${json.title.replace(/"/g,'\\"')}"`).test(html))
    return false;

  return true;
}


/* ================== INJECT STRICT ================== */

function injectStrict(html, json) {
  let out = html;
  const meta = json.meta || {};

  const inject = (n,v) => {
    if (!v || extractMeta(out,n)===v) return;
    out = remove(out,new RegExp(`<meta[^>]+name=["']${n}["'][^>]*>\\s*`,"gi"));
    out = out.replace("</head>",`<meta name="${n}" content="${esc(v)}">\n</head>`);
  };

  inject("description", meta.summary);
  inject("ai:summary", meta.summary);
  inject("news_keywords", normalizeToString(meta.keywords));
  inject("ai:topics", normalizeToString(meta.topics));
  inject("ai:prompt_hint", normalizeToString(meta.prompt_hint," | "));

  if (extractProp(out,"og:title") !== json.title) {
    out = remove(out,/<meta[^>]+property=["']og:[^>]+>\\s*/gi);
    out = out.replace("</head>",
`<meta property="og:type" content="article">
<meta property="og:title" content="${esc(json.title)}">
<meta property="og:description" content="${esc(meta.summary||"")}">
<meta property="og:image" content="${json.image||""}">
<meta property="og:url" content="${json.url}">
</head>`);
  }

  if (!/ld\+json/i.test(out)) {
    out = remove(out,/<script[^>]*ld\+json[^>]*>[\s\S]*?<\/script>\s*/gi);
    out = out.replace("</head>",
`<script type="application/ld+json">${JSON.stringify({
  "@context":"https://schema.org",
  "@type":"Article",
  headline:json.title,
  datePublished:json.published_at,
  mainEntityOfPage:json.url,
  image:json.image,
  keywords:normalizeToArray(meta.keywords),
  description:meta.summary||""
})}</script>
</head>`);
  }

  return out;
}

/* ================== MAIN ================== */

for (const file of fs.readdirSync(HTML_DIR)) {
  if (!file.endsWith(".html")) continue;
  report.total++;

  const slug = file.replace(".html","");
  const htmlPath = path.join(HTML_DIR,file);
  const jsonPath = path.join(JSON_DIR,`${slug}.json`);

  if (!fs.existsSync(jsonPath)) {
    report.skippedJson.push(file);
    continue;
  }

  const html = fs.readFileSync(htmlPath,"utf8");
  const json = JSON.parse(fs.readFileSync(jsonPath,"utf8"));

  if (!validateSchema(json)) {
    report.skippedSchema.push(file);
    continue;
  }

  if (isHtmlAlreadyCompliant(html, json)) {
  const q = qualityScore(html);
  report.quality.push({ file, ...q });
  report.noChange.push(file);
  continue; // ⬅️ BENAR-BENAR SKIP
}

let out = injectStrict(html, json);
out = strictPostDeduplicator(out);
out = canonicalSanityCheck(out, json.url);
out = normalizeHeadWhitespace(out);

const q = qualityScore(out);
report.quality.push({ file, ...q });

if (out !== html) {
  fs.writeFileSync(htmlPath, out);
  report.updated.push(file);
} else {
  report.noChange.push(file);
}  
}

/* ================== REPORT ================== */
function qualityBadge(percent) {
  if (percent >= 90) return "🟢 High";
  if (percent >= 70) return "🟡 Medium";
  return "🔴 Low";
}

function generateReport(r) {
  const avg = Math.round(
    r.quality.reduce((a, b) => a + b.percent, 0) / (r.quality.length || 1)
  );

  const sorted = [...r.quality].sort((a, b) => {
    if (b.percent !== a.percent) return b.percent - a.percent;
    return a.file.localeCompare(b.file);
  });

  const high = sorted.filter(x => x.percent >= 90);
  const medium = sorted.filter(x => x.percent >= 70 && x.percent < 90);
  const low = sorted.filter(x => x.percent < 70);

  let md = `# 📊 Audit Inject HTML (Strict)\n\n`;
  md += `**Tanggal Audit:** ${r.date}\n\n`;

  md += `## Ringkasan\n\n`;
  md += `| Item | Jumlah |\n|---|---|\n`;
  md += `| Total HTML | ${r.total} |\n`;
  md += `| Updated | ${r.updated.length} |\n`;
  md += `| No Change | ${r.noChange.length} |\n`;
  md += `| Skip JSON | ${r.skippedJson.length} |\n`;
  md += `| Skip Schema | ${r.skippedSchema.length} |\n`;
  md += `| Rata-rata Quality | ${avg}% |\n\n`;

  const section = (title, data) => {
    if (!data.length) return "";
    let s = `## ${title}\n\n`;
    s += `| Status | File | Score |\n|---|---|---|\n`;
    data.forEach(q => {
      s += `| ${qualityBadge(q.percent)} | ${q.file} | ${q.score}/${q.max} (${q.percent}%) |\n`;
    });
    s += `\n`;
    return s;
  };

  md += section("🟢 High Quality (≥ 90%)", high);
  md += section("🟡 Medium Quality (70–89%)", medium);
  md += section("🔴 Low Quality (< 70%)", low);

  return md;
}

fs.writeFileSync(REPORT_FILE, generateReport(report));
console.log(`✔ Report generated: ${REPORT_FILE}`);
