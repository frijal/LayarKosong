// cloudflare-pages-clean.js
const API = "https://api.cloudflare.com/client/v4";
const {
  CF_ACCOUNT_ID: accountId,
  CF_PROJECT_NAME: projectName,
  CF_API_TOKEN: token
} = process.env;

if (!accountId || !projectName || !token) {
  console.error("❌ Environment variable belum lengkap (CF_ACCOUNT_ID, CF_PROJECT_NAME, CF_API_TOKEN).");
  process.exit(1);
}

console.log("🚀 Mengambil daftar deployment…");

const DEFAULT_TIMEOUT = 30_000; // ms

async function fetchWithTimeout(url, opts = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchDeployments() {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments`;
  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.success || !Array.isArray(json.result)) {
    throw new Error(`API Error: ${JSON.stringify(json.errors ?? json)}`);
  }

  return json.result;
}

function isPreviewDeployment(d) {
  return d.production === false ||
         typeof d.production === "undefined" ||
         d.environment === "preview";
}

function getCreatedTime(d) {
  const dateStr = d.created_on ?? d.created_at;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

async function deleteDeployment(id) {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments/${id}`;
  const res = await fetchWithTimeout(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    console.error(`❌ HTTP Error hapus ${id}:`, res.status, res.statusText);
    return false;
  }

  const json = await res.json();
  if (!json.success) {
    console.error(`❌ Gagal hapus ${id}:`, json.errors ?? json);
    return false;
  }

  console.log(`✔ Berhasil hapus ${id}`);
  return true;
}

// Hapus serial untuk menghindari rate limit
async function runDeletesSerial(previews) {
  for (const p of previews) {
    try {
      await deleteDeployment(p.id);
    } catch (err) {
      console.error(`⚠️ Error saat menghapus ${p.id}:`, err);
    }
  }
}

async function run() {
  try {
    const deployments = await fetchDeployments();

    // urutkan dari paling tua ke paling baru
    const previews = deployments
      .filter(isPreviewDeployment)
      .sort((a, b) => getCreatedTime(a) - getCreatedTime(b));

    console.log(`📦 Total deployment ditemukan: ${deployments.length}`);
    console.log(`🔎 Preview deployment ditemukan: ${previews.length}`);

    // jika preview <= 6, hentikan
    if (previews.length <= 1) {
      console.log(`⚠️  Jumlah preview saat ini: ${previews.length}.`);
      console.log("ℹ Syarat hapus harus > 6 item. Pekerjaan dihentikan (Skip).");
      return;
    }

    // Pilih preview yang akan dihapus: ambil dari paling tua sampai tersisa 6 terbaru
    const numToKeep = 6;
    const numToDelete = previews.length - numToKeep;
    const previewsToDelete = previews.slice(0, numToDelete);

    console.log(`🗑 Preview total akan dihapus: ${previewsToDelete.length}`);
    console.log(`🧾 Menyisakan ${numToKeep} preview terbaru.`);

    // Hapus serial untuk menghindari rate limit
    await runDeletesSerial(previewsToDelete);

    console.log("✅ Selesai! Preview lama telah dihapus sehingga tersisa 6 terbaru.");
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("❌ Request timeout.");
    } else {
      console.error("❌ Fatal error:", err.message ?? err);
    }
    process.exit(1);
  }
}

await run();
