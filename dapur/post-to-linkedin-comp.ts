import fs from 'node:fs';

/**
 * CONFIGURATION
 * Pastikan environment variable berikut sudah di-set:
 * LINKEDIN_ACCESS_TOKEN
 * LINKEDIN_ORGANIZATION_ID (format: urn:li:organization:123456)
 */
const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-linkedin-comp.txt';
const BASE_URL = 'https://dalam.web.id';

// --- Helper Functions ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const slugify = (text: string) =>
text.toLowerCase().trim().replace(/\s+/g, '-');

async function httpPost(url: string, body: any, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`POST ${url} gagal (${res.status}): ${errorBody}`);
    }
    return res.json();
}

async function httpGetBinary(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} gagal: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return { buffer, contentType };
}

async function httpPut(url: string, buffer: Buffer, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: buffer
    });
    if (!res.ok) throw new Error(`PUT ${url} gagal: ${res.status}`);
    return res;
}

// --- Main Function ---

async function postToLinkedInCompany() {
    const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    const ORG_ID = process.env.LINKEDIN_ORGANIZATION_ID;

    // Validasi awal
    if (!ACCESS_TOKEN || !ORG_ID) {
        console.error("❌ Error: LINKEDIN_ACCESS_TOKEN atau LINKEDIN_ORGANIZATION_ID tidak ditemukan di env.");
        process.exit(1);
    }

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`❌ Error: File ${JSON_FILE} tidak ditemukan.`);
        return;
    }

    // Load data artikel
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts: any[] = [];

    // Load database postingan lama
    const postedDb = fs.existsSync(DATABASE_FILE)
    ? fs.readFileSync(DATABASE_FILE, 'utf8')
    : "";

    // Parsing data dari JSON
    for (const [cat, posts] of Object.entries<any>(data)) {
        const catSlug = slugify(cat);

        posts.forEach((p: any) => {
            // Bersihkan slug file
            const fileSlug = p[1].replace('.html', '').replace(/^\//, '');

            // Lewati jika ini file agregat
            if (fileSlug.startsWith("agregat-20")) return;

            const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

            // Cek apakah sudah pernah diposting berdasarkan URL-nya
            if (!postedDb.includes(fullUrl)) {
                allPosts.push({
                    title: p[0],
                    url: fullUrl,
                    image: p[2],
                    date: p[3],
                    desc: p[4] || "Archive."
                });
            }
        });
    }

    // Urutkan berdasarkan tanggal terbaru
    allPosts.sort((a, b) => b.date.localeCompare(a.date));

    if (allPosts.length === 0) {
        console.log("🏁 Company: Semua artikel sudah terposting.");
        return;
    }

    // Ambil artikel paling baru yang belum diposting
    const target = allPosts[0];

    const commonHeaders = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202510'
    };

    try {
        console.log(`🏢 Menyiapkan postingan Company Page: ${target.title}`);

        // STEP 1: REGISTER IMAGE
        const registerData = await httpPost(
            'https://api.linkedin.com/rest/images?action=initializeUpload',
            { initializeUploadRequest: { owner: ORG_ID } },
            commonHeaders
        );
        const uploadUrl = registerData.value.uploadUrl;
        const imageUrn = registerData.value.image;

        // STEP 2: UPLOAD IMAGE
        console.log(`📤 Mengambil & upload gambar: ${target.image}`);
        const { buffer, contentType } = await httpGetBinary(target.image);
        await httpPut(uploadUrl, buffer, {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': contentType
        });

        // LinkedIn butuh waktu untuk memproses aset gambar
        console.log("⏳ Menunggu sistem LinkedIn (10 detik)...");
        await delay(10000);

        // STEP 3: POST TO FEED
        await httpPost(
            'https://api.linkedin.com/rest/posts',
            {
                author: ORG_ID,
                commentary: `${target.url}\n\n${target.desc}`,
                visibility: 'PUBLIC',
                content: {
                    media: {
                        id: imageUrn,
                        altText: target.title
                    }
                },
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                lifecycleState: 'PUBLISHED'
            },
            commonHeaders
        );

        // Update database agar tidak diposting ulang
        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, target.url + '\n');

        console.log(`✅ Sukses! Artikel "${target.title}" tayang di Company Page.`);
    } catch (err: any) {
        console.error('❌ LinkedIn Page Error:', err.message);
        process.exit(1);
    }
}

// Jalankan skrip
postToLinkedInCompany();
