import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-linkedin.txt';
const BASE_URL = 'https://dalam.web.id/artikel/';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function postToLinkedIn() {
    const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    const LINKEDIN_PERSON_ID = process.env.LINKEDIN_PERSON_ID;

    if (!fs.existsSync(JSON_FILE)) return;

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts = [];

    // --- LOGIKA PENGUMPULAN DATA ---
    for (const [cat, posts] of Object.entries(data)) {
        posts.forEach(p => {
            // p[0]: judul, p[1]: slug, p[2]: image, p[3]: ISO Date, p[4]: desc
            allPosts.push({ 
                title: p[0], 
                slug: p[1].replace('.html', ''), 
                image: p[2], 
                date: p[3], // Kita simpan tanggal ISO-nya
                desc: p[4] 
            });
        });
    }
    
    // --- SORTING AKURAT (Terbaru di Paling Atas) ---
    // String ISO 8601 bisa di-sort secara alfabetis (descending)
    allPosts.sort((a, b) => b.date.localeCompare(a.date));

    let postedUrls = fs.existsSync(DATABASE_FILE) 
        ? fs.readFileSync(DATABASE_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
        : [];

    // Karena sudah di-sort terbaru, find() akan otomatis mengambil yang paling gres yang belum dipost
    let target = allPosts.find(p => !postedUrls.includes(`${BASE_URL}${p.slug}`));

    if (!target) {
        console.log("🏁 LinkedIn: Semua artikel sudah terposting.");
        return;
    }

    const targetUrl = `${BASE_URL}${target.slug}`;
    const commonHeaders = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202510',
        'Content-Type': 'application/json'
    };

    try {
        console.log(`🚀 Menyiapkan postingan LinkedIn: ${target.title} (${target.date})`);

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
        console.log(`📡 Uploading binary dengan tipe: ${finalType}`);

        await axios.put(uploadUrl, imageResponse.data, {
            headers: { 
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': finalType
            }
        });

        console.log("⏳ Menunggu sistem LinkedIn (10 detik)...");
        await delay(10000);

        // --- STEP 3: POST KE FEED ---
        console.log("📝 Mengirim postingan final...");
        await axios.post('https://api.linkedin.com/rest/posts', {
            author: LINKEDIN_PERSON_ID,
            commentary: `${target.desc}\n\n#Indonesia #Ngopi #Article #Repost #fediverse\n\n${targetUrl}`,
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
        }, { headers: commonHeaders });

        // Simpan URL ke database plain text
        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        
        console.log(`✅ Berhasil! Artikel "${target.title}" sudah tayang di LinkedIn.`);
        
    } catch (err) {
        console.error('❌ LinkedIn Error:', JSON.stringify(err.response?.data || err.message, null, 2));
        process.exit(1);
    }
}

postToLinkedIn();
