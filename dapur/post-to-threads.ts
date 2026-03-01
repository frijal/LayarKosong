import * as fs from 'fs';
import path from 'path';

const JSON_FILE = 'artikel.json';
const DATABASE_DIR = 'mini';
const DATABASE_FILE = path.join(DATABASE_DIR, 'posted-threads.txt');
const DOMAIN_URL = 'https://dalam.web.id';

type Candidate = {
  title: string;
  url: string;
  slug: string;
  date: string;
  desc: string;
  category: string;
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const slugify = (text: string) =>
text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

// --- FUNGSI UTAMA ---
async function postToThreads(): Promise<void> {
  const ACCESS_TOKEN = Bun.env.THREADS_ACCESS_TOKEN;
  const THREADS_USER_ID = Bun.env.THREADS_USER_ID;
  const API_BASE = 'https://graph.threads.net/v1.0';

  // Header "Browser" agar tidak disangka bot kasar
  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  if (!fs.existsSync(JSON_FILE)) return;
  if (!ACCESS_TOKEN || !THREADS_USER_ID) return;

  const raw = fs.readFileSync(JSON_FILE, 'utf8');
  const data: Record<string, any[]> = JSON.parse(raw);
  const allPosts: Candidate[] = [];

  const postedDatabase = fs.existsSync(DATABASE_FILE) ? fs.readFileSync(DATABASE_FILE, 'utf8') : '';

  for (const [cat, posts] of Object.entries(data)) {
    const catSlug = slugify(cat);
    for (const p of posts) {
      const rawPath = String(p[1] ?? '');
      const fileSlug = rawPath.replace('.html', '').replace(/^\//, '');
      if (fileSlug.startsWith('agregat-20')) continue;

      const fullUrl = `${DOMAIN_URL}/${catSlug}/${fileSlug}`;
      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: String(p[0] ?? ''),
                      url: fullUrl,
                      slug: fileSlug,
                      date: String(p[3] ?? ''),
                      desc: String(p[4] ?? ''),
                      category: cat
        });
      }
    }
  }

  allPosts.sort((a, b) => b.date.localeCompare(a.date));
  if (allPosts.length === 0) return;

  const target = allPosts[0];

  try {
    console.log(`🚀 Menyiapkan Threads: ${target.title}`);

    // Step 1: Create Container
    const containerBody = {
      media_type: 'TEXT',
      text: `${target.desc}\n\n#LayarKosong #Repost`,
      link_attachment: target.url,
      access_token: ACCESS_TOKEN
    };

    const resContainer = await fetch(`${API_BASE}/${THREADS_USER_ID}/threads`, {
      method: 'POST',
      headers: BROWSER_HEADERS,
      body: JSON.stringify(containerBody)
    });

    const containerJson: any = await resContainer.json();

    if (!resContainer.ok) {
      // Jika kena block, tampilkan pesan lebih ramah
      if (containerJson.error?.error_subcode === 2207051) {
        console.error('⚠️ Meta Block: Akun butuh istirahat (Action Blocked).');
      }
      throw new Error(`Container Error: ${JSON.stringify(containerJson)}`);
    }

    const creationId = containerJson?.id;
    console.log(`📦 Container ID: ${creationId}. Jeda 15 detik...`);

    // Tambah delay dikit jadi 15 detik agar lebih natural
    await delay(15000);

    // Step 2: Publish
    const resPublish = await fetch(`${API_BASE}/${THREADS_USER_ID}/threads_publish`, {
      method: 'POST',
      headers: BROWSER_HEADERS,
      body: JSON.stringify({
        creation_id: creationId,
        access_token: ACCESS_TOKEN
      })
    });

    if (!resPublish.ok) {
      const errText = await resPublish.text();
      throw new Error(`Publish failed: ${errText}`);
    }

    if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true });
    fs.appendFileSync(DATABASE_FILE, target.url + '\n', 'utf8');

    console.log(`✅ Sukses: ${target.title}`);
  } catch (err: any) {
    console.error('❌ Threads Gagal:', err.message);
    process.exit(1);
  }
}

await postToThreads();
