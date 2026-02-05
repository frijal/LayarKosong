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

  if (!json.success || !Array.isArray(json.result)) {
    console.error("❌ API Error:", json.errors ?? "Response tidak valid");
    process.exit(1);
  }

  const deployments = json.result;

  const previews = deployments
    .filter(d =>
      d.production === false ||
      typeof d.production === "undefined" ||
      d.environment === "preview"
    )
    // paling lama → paling baru
    .sort((a, b) => {
      const ta = new Date(a.created_on || a.created_at).getTime();
      const tb = new Date(b.created_on || b.created_at).getTime();
      return ta - tb;
    });

  console.log(`📦 Total deployment ditemukan: ${deployments.length}`);
  console.log(`🗑 Preview yang akan dihapus (urut lama → baru): ${previews.length}`);

  if (previews.length === 0) {
    console.log("ℹ Tidak ada preview yang memenuhi kriteria penghapusan");
    return;
  }

  for (const { id } of previews) {
    await deleteDeployment(accountId, projectName, token, id);
  }

  console.log("✅ Selesai! Semua preview diproses dari yang paling lama.");
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
    console.error(`❌ HTTP Error hapus ${id}:`, res.status, res.statusText);
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
