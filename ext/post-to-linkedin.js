import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-linkedin.txt';
const BASE_URL = 'https://dalam.web.id/artikel/';

// Fungsi untuk memberi jeda waktu
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

    try {
        console.log(`🚀 Menyiapkan postingan LinkedIn: ${target.title}`);
        
        // Jeda 10 detik agar environment GitHub Actions stabil
        console.log("⏳ Menunggu 10 detik sebelum mengirim...");
        await delay(10000);

        await axios.post('https://api.linkedin.com/rest/posts', {
            author: LINKEDIN_PERSON_ID,
            // URUTAN BARU: Deskripsi -> Hashtag -> Link di paling bawah
            commentary: `${target.desc}\n\n#LayarKosong #Repost #Ngopi #Article\n\nBaca selengkapnya: ${targetUrl}`,
            visibility: 'PUBLIC',
            distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: 'PUBLISHED'
        }, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202510' 
            }
        });

        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        console.log(`✅ LinkedIn Berhasil diposting! Urutan: Desc -> Hashtag -> Link`);
        
    } catch (err) {
        console.error('❌ LinkedIn Error:', JSON.stringify(err.response?.data || err.message, null, 2));
        process.exit(1);
    }
}

postToLinkedIn();
