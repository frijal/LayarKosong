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

    for (const [cat, posts] of Object.entries(data)) {
        posts.forEach(p => {
            allPosts.push({ 
                title: p[0], 
                slug: p[1].replace('.html', ''), 
                image: p[2], 
                desc: p[4] 
            });
        });
    }
    
    allPosts.reverse(); 

    let postedUrls = fs.existsSync(DATABASE_FILE) 
        ? fs.readFileSync(DATABASE_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
        : [];

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
        
        // Cek content-type dari response blog
        const finalContentType = imageResponse.headers['content-type'] || 'image/webp';
        console.log(`📡 Uploading binary dengan tipe: ${finalContentType}`);

        await axios.put(uploadUrl, imageResponse.data, {
            headers: { 
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': finalContentType
            }
        });

        console.log("⏳ Menunggu sistem LinkedIn (10 detik)...");
        await delay(10000);

        // --- STEP 3: POST KE FEED ---
        console.log("📝 Mengirim postingan final...");
        await axios.post('https://api.linkedin.com/rest/posts', {
            author: LINKEDIN_PERSON_ID,
            commentary: `${target.desc}\n\n#repost #ngopi #article #Indonesia\n\n${targetUrl}`,
            visibility: 'PUBLIC',
            content: {
                media: {
                    id: imageUrn,
                    altText: target.title
                }
            },
            lifecycleState: 'PUBLISHED'
        }, { headers: commonHeaders });

        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        console.log(`✅ Berhasil! Artikel "${target.title}" sudah tayang.`);
        
    } catch (err) {
        console.error('❌ LinkedIn Error:', JSON.stringify(err.response?.data || err.message, null, 2));
        process.exit(1);
    }
}

postToLinkedIn();
