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

    if (!ACCESS_TOKEN || !ORG_ID || !fs.existsSync(JSON_FILE)) return;

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts: any[] = [];
    const postedDb = fs.existsSync(DATABASE_FILE) ? fs.readFileSync(DATABASE_FILE, 'utf8') : "";

    for (const [cat, posts] of Object.entries<any>(data)) {
        const catSlug = slugify(cat);
        posts.forEach((p: any) => {
            const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
            if (fileSlug.startsWith("agregat-20")) return;
            const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

            if (!postedDb.includes(fullUrl)) {
                allPosts.push({ title: p[0], url: fullUrl, date: p[3], desc: p[4] || "Archive." });
            }
        });
    }

    allPosts.sort((a, b) => b.date.localeCompare(a.date));
    if (allPosts.length === 0) return console.log("🏁 Company: Clear.");

    const target = allPosts[0];
    const commonHeaders = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202510',
        'Content-Type': 'application/json'
    };

    try {
        console.log(`🏢 Post ke Company Page (Mode Link): ${target.title}`);

        // KITA LANGSUNG KE STEP POSTING (TANPA UPLOAD IMAGE)
        await httpPost(
            'https://api.linkedin.com/v2/ugcPosts',
            {
                author: ORG_ID,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: `${target.title}\n\n${target.url}` },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
            },
            {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'X-Restli-Protocol-Version': '2.0.0' // Penting!
            }
        );

        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, target.url + '\n');
        console.log(`✅ Berhasil posting link ke Company Page!`);

    } catch (err: any) {
        console.error('❌ LinkedIn Page Error:', err.message);
        // Jika masih error 403/400, berarti token benar-benar tidak punya akses ke ORG_ID
        process.exit(1);
    }
}

// Jalankan skrip
postToLinkedInCompany();
