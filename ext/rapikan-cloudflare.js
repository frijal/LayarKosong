// cloudflare-pages-clean.js
const API = "https://api.cloudflare.com/client/v4";

// Destructuring ENV
const {
  CF_ACCOUNT_ID: accountId,
  CF_PROJECT_NAME: projectName,
  CF_API_TOKEN: token
} = process.env;

// Validasi awal
if (!accountId || !projectName || !token) {
  console.error("❌ Environment variable belum lengkap.");
  process.exit(1);
}

// Fungsi ambil data dengan parameter per_page maksimal
async function fetchDeployments() {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=25`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  const json = await res.json();
  if (!json.success) throw new Error(`API Error: ${JSON.stringify(json.errors)}`);
  return json.result;
}

// Fungsi hapus
async function deleteDeployment(id) {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  const json = await res.json();
  return json.success;
}

try {
  const deployments = await fetchDeployments();
  
  // Filter hanya preview & urutkan dari TERLAMA ke TERBARU
  const previews = deployments
    .filter(d => d.environment === "preview" || d.production === false)
    .sort((a, b) => new Date(a.created_on) - new Date(b.created_on));

  console.log(`📦 Total Preview: ${previews.length}`);

  // 👉 LOGIKA BARU: Simpan 6 terbaru, hapus sisanya.
  const LIMIT = 6;
  if (previews.length <= LIMIT) {
    console.log(`✅ Preview masih di bawah limit (${LIMIT}). Tidak ada yang dihapus.`);
    process.exit(0);
  }

  // Ambil list yang mau dihapus (semua kecuali 6 item terakhir)
  const toDelete = previews.slice(0, previews.length - LIMIT);

  console.log(`🗑 Menghapus ${toDelete.length} preview lama, menyisakan ${LIMIT} terbaru...`);

  

  for (const p of toDelete) {
    const success = await deleteDeployment(p.id);
    if (success) {
      console.log(`✔ Deleted: ${p.id} (${p.deployment_trigger?.metadata?.branch || 'no-branch'})`);
    } else {
      console.log(`❌ Failed: ${p.id}`);
    }
  }

  console.log("✅ Pembersihan selesai!");
} catch (err) {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
}
