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

async function fetchDeployments() {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments`;
  const res = await fetch(url, {
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
  const res = await fetch(url, {
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

try {
  const deployments = await fetchDeployments();

  const previews = deployments
    .filter(isPreviewDeployment)
    .sort((a, b) => getCreatedTime(a) - getCreatedTime(b));

  console.log(`📦 Total deployment ditemukan: ${deployments.length}`);
  console.log(`🔎 Preview deployment ditemukan: ${previews.length}`);

  // LOGIKA: jika preview <= 6, hentikan
  if (previews.length <= 6) {
    console.log(`⚠️  Jumlah preview saat ini: ${previews.length}.`);
    console.log("ℹ Syarat hapus harus > 6 item. Pekerjaan dihentikan (Skip).");
    process.exit(0);
  }

  console.log(`🗑 Preview yang akan diproses: ${previews.length}`);

  // Jika ingin menghapus semua preview (sesuai kode awal), lakukan loop serial:
  for (const p of previews) {
    const id = p.id;
    try {
      await deleteDeployment(id);
    } catch (err) {
      console.error(`⚠️ Error saat menghapus ${id}:`, err);
    }
  }

  console.log("✅ Selesai! Semua preview diproses karena sudah melebihi kuota.");
  process.exit(0);
} catch (err) {
  console.error("❌ Fatal error:", err.message ?? err);
  process.exit(1);
}
