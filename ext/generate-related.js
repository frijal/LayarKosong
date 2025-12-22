import fs from "fs";
import path from "path";

/* ================== KONFIG ================== */

const POST_DIR = "api/v1/post";
const CLUSTER_FILE = "api/v1/topic-cluster.json";
const OUT_DIR = "api/v1/related";
const MAX_RELATED = 6;

/* ================== LOAD DATA ================== */

if (!fs.existsSync(CLUSTER_FILE)) {
  console.error("❌ topic-cluster.json tidak ditemukan.");
  process.exit(1);
}

const clusterData = JSON.parse(
  fs.readFileSync(CLUSTER_FILE, "utf8")
);

const clusters = clusterData.clusters || {};

/* ================== BUILD INDEX ================== */

const slugIndex = {};

/*
  slugIndex = {
    "ventoy-install-linux": {
      label: "linux usb",
      articles: [...]
    }
  }
*/

Object.values(clusters).forEach(cluster => {
  cluster.articles.forEach(a => {
    slugIndex[a.slug] = {
      label: cluster.label,
      articles: cluster.articles
    };
  });
});

/* ================== OUTPUT DIR ================== */

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/* ================== GENERATE PER SLUG ================== */

let generated = 0;

for (const slug of Object.keys(slugIndex)) {
  const cluster = slugIndex[slug];

  const related = cluster.articles
    .filter(a => a.slug !== slug)
    .sort((a,b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, MAX_RELATED)
    .map(a => ({
      slug: a.slug,
      title: a.title,
      url: a.url,
      score: a.score
    }));

  // skip jika tidak ada related
  if (!related.length) continue;

  const output = {
    slug,
    cluster: cluster.label,
    total: related.length,
    related
  };

  const outFile = path.join(OUT_DIR, `${slug}.json`);
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  generated++;
}

/* ================== SUMMARY ================== */

console.log("✔ Related articles API generated");
console.log(`• Cluster source : ${CLUSTER_FILE}`);
console.log(`• Output folder  : ${OUT_DIR}`);
console.log(`• Slug generated : ${generated}`);
