import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const POST_DIR = "api/v1/post";
const OUT_DIR  = "api/v1/related";
const MAX_RELATED = 6;

/* ================== UTIL ================== */

const normalize = v =>
  !v ? [] :
  Array.isArray(v)
    ? v.map(x => String(x).toLowerCase().trim()).filter(Boolean)
    : [String(v).toLowerCase().trim()];

const intersectCount = (a, b) =>
  a.filter(x => b.includes(x)).length;

/* ================== LOAD POSTS ================== */

const posts = [];

for (const f of fs.readdirSync(POST_DIR)) {
  if (!f.endsWith(".json")) continue;

  const data = JSON.parse(
    fs.readFileSync(path.join(POST_DIR, f), "utf8")
  );

  posts.push({
    slug: f.replace(".json", ""),
    topics: normalize(data?.meta?.topics),
    keywords: normalize(data?.meta?.keywords)
  });
}

/* ================== BUILD RELATION ================== */

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const p of posts) {
  const related = [];

  for (const other of posts) {
    if (p.slug === other.slug) continue;

    const topicScore   = intersectCount(p.topics, other.topics) * 2;
    const keywordScore = intersectCount(p.keywords, other.keywords);

    const score = topicScore + keywordScore;
    if (score === 0) continue;

    related.push({ slug: other.slug, score });
  }

  related.sort((a, b) =>
    b.score - a.score || a.slug.localeCompare(b.slug)
  );

  fs.writeFileSync(
    path.join(OUT_DIR, `${p.slug}.json`),
    JSON.stringify({
      slug: p.slug,
      related: related.slice(0, MAX_RELATED)
    }, null, 2)
  );
}

console.log("✔ Related articles generated:", posts.length);
