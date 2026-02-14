import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-linkedin.txt';
const BASE_URL = 'https://dalam.web.id';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const slugify = (text) =>
text.toLowerCase().trim().replace(/\s+/g, '-');

async function postToLinkedIn() {
    const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    const LINKEDIN_PERSON_ID = process.env.LINKEDIN_PERSON_ID;

    if (!fs.existsSync(JSON_FILE)) return;

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts = [];

    // --- LOAD DATABASE (Cek sebagai String Besar untuk filter Slug) ---
    let postedDatabase = fs.existsSync(DATABASE_FILE)
    ? fs.readFileSync(DATABASE_FILE, 'utf8')
    : "";

    // --- LOGIKA PENGUMPULAN DATA V6.9 ---
    for (const [cat, posts] of Object.entries(data)) {
        const catSlug = slugify(cat);

        posts.forEach(p => {
            const fileSlug = p[1].replace('.html', '').replace(/^\//, '');

            // 1. FILTER AGREGAT: Gunakan return karena di dalam forEach
            if (fileSlug.startsWith("agregat-20")) {
                return; // Lewati rekap tahunan
            }

            const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

            // Cek apakah slug sudah ada di dalam rekaman database teks
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

    // --- SORTING TERBARU DULUAN ---
    allPosts.sort((a, b) => b.date.localeCompare(a.date));

    if (allPosts.length === 0) {
        console.log("🏁 LinkedIn: Semua artikel sudah terposting (berdasarkan cek slug).");
        return;
    }

    // Ambil artikel paling gres yang lolos filter
    const target = allPosts[0];

    const commonHeaders = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202510',
        'Content-Type': 'application/json'
    };

    try {
        console.log(`🚀 Menyiapkan postingan LinkedIn: ${target.title}`);

        // --- STEP 1: REGISTER IMAGE ---
        console.log("📸 Meregistrasi gambar ke LinkedIn...");
        const registerRes = await axios.post('https://api.linkedin.com/rest/images?action=initializeUpload', {
            initializeUploadRequest: {
                owner: LINKEDIN_PERSON_ID
            }
        }, { headers: commonHeaders });

        const uploadUrl = registerRes.data.value.uploadUrl;
        const imageUrn = registerRes.data.value.image;

        // --- STEP 2: UPLOAD BINARY GAMBAR ---
        console.log(`📤 Mengambil gambar dari: ${target.image}`);
        const imageResponse = await axios.get(target.image, { responseType: 'arraybuffer' });
        const finalType = imageResponse.headers['content-type'] || 'image/webp';

        await axios.put(uploadUrl, imageResponse.data, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': finalType
            }
        });

        console.log("⏳ Menunggu sistem LinkedIn (10 detik)...");
        await delay(10000);

        // --- STEP 3: POST KE FEED (Kembali ke struktur asli Mas Rijal) ---
        console.log("📝 Mengirim postingan final...");
        await axios.post('https://api.linkedin.com/rest/posts', {
            author: LINKEDIN_PERSON_ID,
            // Tetap menggunakan target.url yang sudah V6.9
            commentary: `${target.url}\n${target.desc}`,
            visibility: 'PUBLIC',
            content: {
                media: {
                    id: imageUrn,
                    altText: target.title
                }
            },
            // Bagian ini yang tadi sempat hilang/berbeda:
            distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: 'PUBLISHED'
        }, { headers: commonHeaders });

        // Simpan URL baru ke database
        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, target.url + '\n');

        console.log(`✅ Berhasil! Artikel "${target.title}" sudah tayang di LinkedIn.`);

    } catch (err) {
        console.error('❌ LinkedIn Error:', JSON.stringify(err.response?.data || err.message, null, 2));
        process.exit(1);
    }
}

postToLinkedIn();
