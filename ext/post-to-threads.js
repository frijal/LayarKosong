import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-threads.txt';
const BASE_URL = 'https://dalam.web.id/artikel/';

// Fungsi untuk memberi jeda waktu
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function postToThreads() {
    const ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
    const THREADS_USER_ID = process.env.THREADS_USER_ID;
    const API_BASE = 'https://graph.threads.net/v1.0';

    if (!fs.existsSync(JSON_FILE)) return;

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts = [];
    for (const [cat, posts] of Object.entries(data)) {
        posts.forEach(p => {
            allPosts.push({ title: p[0], slug: p[1].replace('.html', ''), desc: p[4] });
        });
    }

    allPosts.reverse();

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
        console.log(`🚀 Membuat Media Container: ${target.title}`);
        
        // Step 1: Create Container (Gunakan hanya 1 hashtag sesuai temuanmu)
        const resContainer = await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads`, {
            media_type: 'TEXT',
            text: `📝 ${target.title}\n\n${target.desc}\n\n#repost`,
            link_attachment: targetUrl,
            access_token: ACCESS_TOKEN
        });

        const creationId = resContainer.data.id;
        console.log(`📦 Container ID: ${creationId}. Menunggu 10 detik agar server Threads siap...`);

        // Jeda 10 detik agar tidak terkena error "Media Not Found"
        await delay(10000);

        // Step 2: Publish
        await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads_publish`, {
            creation_id: creationId,
            access_token: ACCESS_TOKEN
        });

        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        console.log(`✅ Berhasil diposting ke Threads!`);
    } catch (err) {
        const errorData = err.response?.data || err.message;
        console.error('❌ Gagal:', JSON.stringify(errorData, null, 2));
        process.exit(1);
    }
}

postToThreads();
