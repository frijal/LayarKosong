import * as fs from 'fs';
import path from 'path';

const JSON_FILE = 'artikel.json';
const DATABASE_DIR = 'mini';
const DATABASE_FILE = path.join(DATABASE_DIR, 'posted-threads.txt');
const DOMAIN_URL = 'https://dalam.web.id';

type RawPost = any; // struktur input tidak sepenuhnya jelas, gunakan any atau definisikan sesuai file JSON
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

async function postToThreads(): Promise<void> {
  const ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
  const THREADS_USER_ID = process.env.THREADS_USER_ID;
  const API_BASE = 'https://graph.threads.net/v1.0';

  if (!fs.existsSync(JSON_FILE)) {
    console.log(`❗ File ${JSON_FILE} tidak ditemukan. Batalkan.`);
    return;
  }

  if (!ACCESS_TOKEN || !THREADS_USER_ID) {
    console.log('❗ Pastikan env THREADS_ACCESS_TOKEN dan THREADS_USER_ID sudah di-set.');
    return;
  }

  const raw = fs.readFileSync(JSON_FILE, 'utf8');
  const data: Record<string, RawPost[]> = JSON.parse(raw);
  const allPosts: Candidate[] = [];

  // load database (cek slug sebagai string besar)
  const postedDatabase = fs.existsSync(DATABASE_FILE)
    ? fs.readFileSync(DATABASE_FILE, 'utf8')
    : '';

  // kumpulkan data dengan for..of agar bisa continue
  for (const [cat, posts] of Object.entries(data)) {
    const catSlug = slugify(cat);

    for (const p of posts) {
      // p diasumsikan array: [title, path, ?, date, desc?]
      const rawPath = String(p[1] ?? '');
      const fileSlug = rawPath.replace('.html', '').replace(/^\//, '');

      // filter agregat
      if (fileSlug.startsWith('agregat-20')) {
        continue;
      }

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

  // sorting terbaru duluan (asumsi date string bisa dibandingkan lexicographically)
  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  if (allPosts.length === 0) {
    console.log('🏁 Threads: Semua artikel sudah terposting (berdasarkan cek slug).');
    return;
  }

  const target = allPosts[0];

  try {
    console.log(`🚀 Menyiapkan Threads: ${target.title} (${target.date})`);

    // Step 1: Create Container
    const containerUrl = `${API_BASE}/${THREADS_USER_ID}/threads`;
    const containerBody = {
      media_type: 'TEXT',
      text: `${target.desc}\n\n#Repost`,
      link_attachment: target.url,
      access_token: ACCESS_TOKEN
    };

    const resContainer = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody)
    });

    if (!resContainer.ok) {
      const err = await resContainer.text();
      throw new Error(`Create container failed: ${resContainer.status} ${err}`);
    }

    const containerJson = await resContainer.json();
    const creationId = containerJson?.id;
    if (!creationId) throw new Error('No creation id returned from Threads API');

    console.log(`📦 Container ID: ${creationId}. Menunggu 10 detik...`);
    await delay(10000);

    // Step 2: Publish
    const publishUrl = `${API_BASE}/${THREADS_USER_ID}/threads_publish`;
    const publishBody = {
      creation_id: creationId,
      access_token: ACCESS_TOKEN
    };

    const resPublish = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publishBody)
    });

    if (!resPublish.ok) {
      const err = await resPublish.text();
      throw new Error(`Publish failed: ${resPublish.status} ${err}`);
    }

    // Simpan FULL URL ke database
    if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true });
    fs.appendFileSync(DATABASE_FILE, target.url + '\n', 'utf8');

    console.log(`✅ Berhasil diposting ke Threads: ${target.title}`);
  } catch (err: any) {
    console.error('❌ Threads Gagal:', err?.message ?? err);
    // jangan exit otomatis jika ingin menjalankan di environment yang mengelola proses
    process.exit(1);
  }
}

await postToThreads();
