import fs from 'fs';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-linkedin.txt';
const BASE_URL = 'https://dalam.web.id';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

// --- Helper Functions ---
async function httpPost(url: string, body: any, headers: Record<string,string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${url} gagal: ${res.status}`);
  return res.json();
}

async function httpGetBinary(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} gagal: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
}

async function httpPut(url: string, buffer: Buffer, headers: Record<string,string> = {}) {
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: buffer
  });
  if (!res.ok) throw new Error(`PUT ${url} gagal: ${res.status}`);
  return res;
}

// --- Main Function ---
async function postToLinkedIn() {
  const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
  const LINKEDIN_PERSON_ID = process.env.LINKEDIN_PERSON_ID;

  if (!fs.existsSync(JSON_FILE)) return;

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  let allPosts: any[] = [];

  let postedDatabase = fs.existsSync(DATABASE_FILE)
    ? fs.readFileSync(DATABASE_FILE, 'utf8')
    : "";

  for (const [cat, posts] of Object.entries<any>(data)) {
    const catSlug = slugify(cat);

    posts.forEach((p: any) => {
      const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
      if (fileSlug.startsWith("agregat-20")) return;

      const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: p[0],
          url: fullUrl,
          slug: fileSlug,
          image: p[2],
          date: p[3],
          desc: p[4] || "Archive."
        });
      }
    });
  }

  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  if (allPosts.length === 0) {
    console.log("🏁 LinkedIn: Semua artikel sudah terposting.");
    return;
  }

  const target = allPosts[0];

  const commonHeaders = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202510',
    'Content-Type': 'application/json'
  };

  try {
    console.log(`🚀 Menyiapkan postingan LinkedIn: ${target.title}`);

    // STEP 1: REGISTER IMAGE
    const registerData = await httpPost(
      'https://api.linkedin.com/rest/images?action=initializeUpload',
      { initializeUploadRequest: { owner: LINKEDIN_PERSON_ID } },
      commonHeaders
    );
    const uploadUrl = registerData.value.uploadUrl;
    const imageUrn = registerData.value.image;

    // STEP 2: UPLOAD IMAGE
    console.log(`📤 Mengambil gambar dari: ${target.image}`);
    const { buffer, contentType } = await httpGetBinary(target.image);
    await httpPut(uploadUrl, buffer, {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': contentType
    });

    console.log("⏳ Menunggu sistem LinkedIn (10 detik)...");
    await delay(10000);

    // STEP 3: POST TO FEED
    await httpPost(
      'https://api.linkedin.com/rest/posts',
      {
        author: LINKEDIN_PERSON_ID,
        commentary: `${target.url}\n${target.desc}`,
        visibility: 'PUBLIC',
        content: { media: { id: imageUrn, altText: target.title } },
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: 'PUBLISHED'
      },
      commonHeaders
    );

    if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
    fs.appendFileSync(DATABASE_FILE, target.url + '\n');

    console.log(`✅ Berhasil! Artikel "${target.title}" sudah tayang di LinkedIn.`);
  } catch (err: any) {
    console.error('❌ LinkedIn Error:', err.message || err);
    process.exit(1);
  }
}

postToLinkedIn();
