import "dotenv/config";

const API = "https://api.cloudflare.com/client/v4";

async function main() {
  const {
    CF_ACCOUNT_ID: accountId,
    CF_PROJECT_NAME: projectName,
    CF_API_TOKEN: token
  } = process.env;

  if (!accountId || !projectName || !token) {
    console.error("❌ Environment variable belum lengkap");
    process.exit(1);
  }

  console.log("🚀 Mengambil daftar deployment…");

  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    console.error("❌ HTTP Error:", res.status, res.statusText);
    process.exit(1);
  }

  const json = await res.json();

  if (!json.success) {
    console.error("❌ API Error:", json.errors);
    process.exit(1);
  }

  const deployments = json.result ?? [];
  const previews = deployments.filter(d => !d.production);

  console.log(`📦 Total deployment ditemukan: ${deployments.length}`);
  console.log(`🗑 Preview yang akan dihapus: ${previews.length}`);

  for (const d of previews) {
    await deleteDeployment(accountId, projectName, token, d.id);
  }

  console.log("✅ Selesai! Semua preview dihapus.");
}

async function deleteDeployment(accountId, projectName, token, id) {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments/${id}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    console.error(`❌ HTTP Error hapus ${id}:`, res.status);
    return;
  }

  const json = await res.json();

  if (!json.success) {
    console.error(`❌ Gagal hapus ${id}`, json.errors);
  } else {
    console.log(`✔ Berhasil hapus ${id}`);
  }
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
