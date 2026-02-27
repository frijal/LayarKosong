import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const JSON_DIR = "api/v1/post";
const OUT_DIR = "api/v1/topic-cluster";

const DATE = new Date().toISOString().slice(0,10).replace(/-/g,"");
const OUT_FILE = path.join(OUT_DIR, `topic-cluster-${DATE}.json`);
const OUT_LATEST = "api/v1/topic-cluster.json";

/* ================== UTIL ================== */

function norm(str="") {
  return String(str)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu,"")
    .replace(/\s+/g," ")
    .trim();
}

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return [v];
  if (typeof v === "object") return Object.values(v);
  return [];
}

function intersect(a,b) {
  const sb = new Set(b);
  return a.filter(x => sb.has(x));
}

/* ================== LOAD ARTIKEL ================== */

const articles = [];

for (const file of fs.readdirSync(JSON_DIR)) {
  if (!file.endsWith(".json")) continue;

  const json = JSON.parse(
    fs.readFileSync(path.join(JSON_DIR, file), "utf8")
  );

  if (!json.slug || !json.meta) continue;

  const topics = toArray(json.meta.topics).map(norm).filter(Boolean);
  const keywords = toArray(json.meta.keywords).map(norm).filter(Boolean);

  articles.push({
    slug: json.slug,
    title: json.title || json.slug,
    url: json.url,
    topics,
    keywords
  });
}

if (!articles.length) {
  console.log("⚠ Tidak ada artikel untuk clustering.");
  process.exit(0);
}

/* ================== CLUSTER ENGINE ================== */

const clusters = {};
const assigned = new Set();

function clusterKey(topic) {
  return topic.replace(/\s+/g,"-");
}

for (let i = 0; i < articles.length; i++) {
  const a = articles[i];
  if (assigned.has(a.slug)) continue;

  // seed cluster: topic → keyword → skip
  const seedTopic =
    a.topics.length ? a.topics[0] :
    a.keywords.length ? a.keywords[0] :
    null;

  if (!seedTopic) continue;

  const key = clusterKey(seedTopic);

  if (!clusters[key]) {
    clusters[key] = {
      label: seedTopic,
      articles: []
    };
  }

  for (let j = i; j < articles.length; j++) {
    const b = articles[j];
    if (assigned.has(b.slug)) continue;

    const commonTopics = intersect(a.topics, b.topics).length;
    const commonKeywords = intersect(a.keywords, b.keywords).length;

    const score = (commonTopics * 3) + commonKeywords;

    if (score >= 3) {
      clusters[key].articles.push({
        slug: b.slug,
        title: b.title,
        url: b.url,
        score
      });
      assigned.add(b.slug);
    }
  }
}

/* ================== SORT & CLEAN ================== */

// sort artikel per cluster
Object.values(clusters).forEach(c => {
  c.articles.sort((a,b)=>b.score-a.score);
});

// hapus cluster kecil (noise)
Object.keys(clusters).forEach(k => {
  if (clusters[k].articles.length < 2) {
    delete clusters[k];
  }
});

/* ================== OUTPUT ================== */

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const output = {
  generated_at: new Date().toISOString(),
  total_articles: articles.length,
  total_clusters: Object.keys(clusters).length,
  clusters
};

// arsip harian
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

// latest (dipakai API / HTML)
fs.writeFileSync(OUT_LATEST, JSON.stringify(output, null, 2));

console.log(`✔ Topic clustering generated`);
console.log(`• Arsip  : ${OUT_FILE}`);
console.log(`• Latest : ${OUT_LATEST}`);
console.log(`• Artikel: ${articles.length}`);
console.log(`• Cluster: ${Object.keys(clusters).length}`);
