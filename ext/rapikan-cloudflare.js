import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const API = "https://api.cloudflare.com/client/v4";

async function main() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const projectName = process.env.CF_PROJECT_NAME;
  const token = process.env.CF_API_TOKEN;

  console.log("🚀 Mengambil daftar deployment…");

  // Penting: Cloudflare tidak menerima parameter page/per_page
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const json = await res.json();

  if (!json.success) {
    console.error("❌ API Error:", json.errors);
    process.exit(1);
  }

  const deployments = json.result;
  const previews = deployments.filter((d) => !d.production);

  console.log(`📦 Total deployment ditemukan: ${deployments.length}`);
  console.log(`🗑 Preview yang akan dihapus: ${previews.length}`);

  for (const d of previews) {
    console.log(`🗑 Menghapus preview: ${d.id}`);
    await deleteDeployment(accountId, projectName, token, d.id);
  }

  console.log("✅ Selesai! Semua preview dihapus.");
}

async function deleteDeployment(accountId, projectName, token, id) {
  const url = `${API}/accounts/${accountId}/pages/projects/${projectName}/deployments/${id}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  const json = await res.json();

  if (!json.success) {
    console.error(`❌ Gagal hapus ${id}`, json.errors);
  } else {
    console.log(`✔ Berhasil hapus ${id}`);
  }
}

main();
