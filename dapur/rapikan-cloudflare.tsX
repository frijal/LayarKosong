// cloudflare-pages-clean.ts

const API = "https://api.cloudflare.com/client/v4";

// Menggunakan Bun.env agar lebih "Bun-way"
const accountId = Bun.env.CF_ACCOUNT_ID;
const projectName = Bun.env.CF_PROJECT_NAME;
const token = Bun.env.CF_API_TOKEN;

if (!accountId || !projectName || !token) {
  console.error("❌ Environment variable belum lengkap (CF_ACCOUNT_ID, CF_PROJECT_NAME, CF_API_TOKEN).");
  process.exit(1);
}

// Interface untuk struktur deployment Cloudflare
interface CloudflareDeployment {
  id: string;
  production: boolean;
  environment: string;
  created_on?: string;
  created_at?: string;
  [key: string]: any;
}

interface CloudflareResponse<T> {
  success: boolean;
  result: T;
  errors: any[];
  messages: any[];
}

console.log("🚀 Mengambil daftar deployment…");

const DEFAULT_TIMEOUT = 30_000; // ms

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchDeployments(): Promise<CloudflareDeployment[]> {
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

  const json = (await res.json()) as CloudflareResponse<CloudflareDeployment[]>;
  if (!json.success || !Array.isArray(json.result)) {
    throw new Error(`API Error: ${JSON.stringify(json.errors ?? json)}`);
  }

  return json.result;
}

function isPreviewDeployment(d: CloudflareDeployment): boolean {
  return d.production === false ||
         typeof d.production === "undefined" ||
         d.environment === "preview";
}

function getCreatedTime(d: CloudflareDeployment): number {
  const dateStr = d.created_on ?? d.created_at;
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

async function deleteDeployment(id: string): Promise<boolean> {
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

  const json = (await res.json()) as CloudflareResponse<any>;
  if (!json.success) {
    console.error(`❌ Gagal hapus ${id}:`, json.errors ?? json);
    return false;
  }

  console.log(`✔ Berhasil hapus ${id}`);
  return true;
}

// Hapus serial untuk menghindari rate limit
async function runDeletesSerial(previews: CloudflareDeployment[]): Promise<void> {
  for (const p of previews) {
    try {
      await deleteDeployment(p.id);
    } catch (err) {
      console.error(`⚠️ Error saat menghapus ${p.id}:`, err);
    }
  }
}

async function run(): Promise<void> {
  try {
    const deployments = await fetchDeployments();

    // urutkan dari paling tua ke paling baru
    const previews = deployments
      .filter(isPreviewDeployment)
      .sort((a, b) => getCreatedTime(a) - getCreatedTime(b));

    console.log(`📦 Total deployment ditemukan: ${deployments.length}`);
    console.log(`🔎 Preview deployment ditemukan: ${previews.length}`);

    // jika preview <= 1, hentikan
    if (previews.length <= 1) {
      console.log(`⚠️  Jumlah preview saat ini: ${previews.length}.`);
      console.log("ℹ Syarat hapus harus > 1 item. Pekerjaan dihentikan (Skip).");
      return;
    }

    // Pilih preview yang akan dihapus: ambil dari paling tua sampai tersisa 1 terbaru
    const numToKeep = 1;
    const numToDelete = previews.length - numToKeep;
    const previewsToDelete = previews.slice(0, numToDelete);

    console.log(`🗑 Preview total akan dihapus: ${previewsToDelete.length}`);
    console.log(`🧾 Menyisakan ${numToKeep} preview terbaru.`);

    // Hapus serial untuk menghindari rate limit
    await runDeletesSerial(previewsToDelete);

    console.log("✅ Selesai!");
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("❌ Request timeout.");
    } else {
      console.error("❌ Fatal error:", err.message ?? err);
    }
    process.exit(1);
  }
}

// Top-level await didukung di TS (tergantung target module/ES version)
await run();
