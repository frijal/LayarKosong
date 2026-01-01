import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-linkedin.txt'; // Database khusus LinkedIn
const BASE_URL = 'https://dalam.web.id/artikel/';

async function postToLinkedIn() {
    const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    const LINKEDIN_PERSON_ID = process.env.LINKEDIN_PERSON_ID;

    if (!fs.existsSync(JSON_FILE)) return;

    // 1. Baca data dari artikel.json
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

    // 2. CEK DATABASE: Baca file agar tidak duplikat
    let postedUrls = fs.existsSync(DATABASE_FILE) 
        ? fs.readFileSync(DATABASE_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
        : [];

    // Cari artikel yang BELUM ada di posted-linkedin.txt
    let target = allPosts.find(p => !postedUrls.includes(`${BASE_URL}${p.slug}`));

    if (!target) {
        console.log("🏁 LinkedIn: Semua artikel sudah terposting. Tidak ada duplikat.");
        return;
    }

    const targetUrl = `${BASE_URL}${target.slug}`;

    try {
        console.log(`🚀 Memposting ke LinkedIn: ${target.title}`);
        
        await axios.post('https://api.linkedin.com/rest/posts', {
            author: LINKEDIN_PERSON_ID,
            commentary: `📝 ${target.title}\n\n${target.desc}\n\n#repost #ngopi #article #indonesia`,
            visibility: 'PUBLIC',
            distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            content: {
                article: {
                    source: targetUrl,
                    title: target.title,
                    description: target.desc,
                    thumbnail: target.image 
                }
            },
            lifecycleState: 'PUBLISHED'
        }, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202510' 
            }
        });

        // 3. TULIS KE DATABASE: Simpan URL yang berhasil diposting
        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        console.log(`✅ LinkedIn Berhasil! URL disimpan di ${DATABASE_FILE}`);
        
    } catch (err) {
        console.error('❌ LinkedIn Error:', JSON.stringify(err.response?.data || err.message, null, 2));
        process.exit(1);
    }
}

postToLinkedIn();
