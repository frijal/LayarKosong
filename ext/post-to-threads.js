import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-threads.txt';
const BASE_URL = 'https://dalam.web.id/artikel/';

async function postToThreads() {
    const ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
    const THREADS_USER_ID = process.env.THREADS_USER_ID;
    const API_BASE = 'https://graph.threads.net/v1.0';

    if (!fs.existsSync(JSON_FILE)) {
        console.error("artikel.json tidak ditemukan!");
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts = [];

    for (const [cat, posts] of Object.entries(data)) {
        posts.forEach(p => {
            allPosts.push({ title: p[0], slug: p[1].replace('.html', ''), desc: p[4] });
        });
    }

    allPosts.reverse(); // Dari artikel terlama

    let postedUrls = fs.existsSync(DATABASE_FILE) 
        ? fs.readFileSync(DATABASE_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
        : [];

    let target = allPosts.find(p => !postedUrls.includes(`${BASE_URL}${p.slug}`));

    if (!target) {
        console.log("🏁 Semua artikel sudah terposting.");
        return;
    }

    const targetUrl = `${BASE_URL}${target.slug}`;

    try {
        console.log(`🚀 Memposting ke Threads: ${target.title}`);
        
        // Step 1: Create Container
        const resContainer = await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads`, {
            media_type: 'TEXT',
            text: `📝 ${target.title}\n\n${target.desc}\n\n#LayarKosong #repost #indonesia`,
            link_attachment: targetUrl,
            access_token: ACCESS_TOKEN
        });

        // Step 2: Publish
        await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads_publish`, {
            creation_id: resContainer.data.id,
            access_token: ACCESS_TOKEN
        });

        // Simpan ke database local agar tidak posting ulang
        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        console.log(`✅ Berhasil posting: ${target.title}`);
    } catch (err) {
        console.error('❌ Gagal:', err.response?.data || err.message);
        process.exit(1);
    }
}

postToThreads();
