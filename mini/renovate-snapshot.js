import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SNAPSHOT_DIR = "mini";
const PREFIX = "renovate-";
const EXT = ".md";
const RETAIN_DAYS = 7;
const now = Date.now();

/* =========================
   1. Generate snapshot baru
   ========================= */

function getDeps() {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  return {
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {}
  };
}

function formatDeps(title, deps) {
  const lines = Object.entries(deps)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `- ${name}: ${version}`);
  return `## ${title}\n${lines.join("\n") || "_none_"}\n`;
}

function timestamp() {
  const d = new Date();
  return d.toISOString().replace(/[-:T]/g, "").slice(0, 12);
}

const ts = timestamp();
const snapshotName = `${PREFIX}${ts}${EXT}`;
const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);

const { dependencies, devDependencies } = getDeps();

const content = `# Renovate Dependency Snapshot
Generated at: ${new Date().toISOString()}

${formatDeps("Dependencies", dependencies)}

${formatDeps("Dev Dependencies", devDependencies)}
`;

fs.writeFileSync(snapshotPath, content);
console.log(`📝 snapshot created: ${snapshotName}`);

/* ===================================
   2. Cari snapshot sebelumnya & diff
   =================================== */

const snapshots = fs.readdirSync(SNAPSHOT_DIR)
  .filter(f => f.startsWith(PREFIX) && f.endsWith(EXT))
  .sort();

const previous = snapshots
  .filter(f => f !== snapshotName)
  .at(-1);

if (previous) {
  const prevContent = fs.readFileSync(
    path.join(SNAPSHOT_DIR, previous),
    "utf8"
  );

  if (prevContent === content) {
    console.log("😴 snapshot identical, removing new snapshot");
    fs.unlinkSync(snapshotPath);
    process.exit(0); // tidak ada perubahan → tidak commit
  }

  console.log(`🔍 changes detected vs ${previous}`);
} else {
  console.log("✨ first snapshot created");
}

/* ==============================
   3. Cleanup snapshot lama
   ============================== */

const MAX_AGE = RETAIN_DAYS * 24 * 60 * 60 * 1000;

for (const file of snapshots) {
  const m = file.match(/\d{12}/);
  if (!m) continue;

  const ts = m[0];
  const fileTime = new Date(
    `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}T${ts.slice(8,10)}:${ts.slice(10,12)}:00Z`
  ).getTime();

  if (now - fileTime > MAX_AGE) {
    fs.unlinkSync(path.join(SNAPSHOT_DIR, file));
    console.log(`🗑️ removed old snapshot: ${file}`);
  }
}

console.log("✅ snapshot process finished");
