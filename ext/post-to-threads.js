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

    // --- LOGIKA PENGUMPULAN DATA ---
    for (const [cat, posts] of Object.entries(data)) {
        posts.forEach(p => {
            // p[0]: judul, p[1]: slug, p[2]: image, p[3]: ISO Date, p[4]: desc
            allPosts.push({
                title: p[0],
                slug: p[1].replace('.html', '').replace(/^\//, ''),
                date: p[3], // ISO 8601 String untuk sorting presisi
                desc: p[4] || "",
                category: cat
            });
        });
    }

    // --- SORTING AKURAT (Terbaru di Paling Atas) ---
    // Membandingkan string ISO secara alfabetis (descending)
    allPosts.sort((a, b) => b.date.localeCompare(a.date));

    let postedUrls = fs.existsSync(DATABASE_FILE)
        ? fs.readFileSync(DATABASE_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
        : [];

    // Mencari artikel terbaru yang belum tercatat di database txt
    let target = allPosts.find(p => !postedUrls.includes(`${BASE_URL}${p.slug}`));

    if (!target) {
        console.log("🏁 Threads: Semua artikel sudah terposting.");
        return;
    }

    const targetUrl = `${BASE_URL}${target.slug}`;

    try {
        console.log(`🚀 Menyiapkan Threads: ${target.title} (${target.date})`);

        // Step 1: Create Container
        // Format: Deskripsi -> Link Attachment (Judul otomatis muncul dari Metadata Link)
        const resContainer = await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads`, {
            media_type: 'TEXT',
            text: `${target.desc}\n\n#Repost #Ngopi #Indonesia #fediverse`,
            link_attachment: targetUrl,
            access_token: ACCESS_TOKEN
        });

        const creationId = resContainer.data.id;
        console.log(`📦 Container ID: ${creationId}. Menunggu 10 detik agar server Threads siap...`);

        // Jeda 10 detik agar tidak terkena error "Media Not Found" saat publish
        await delay(10000);

        // Step 2: Publish
        await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads_publish`, {
            creation_id: creationId,
            access_token: ACCESS_TOKEN
        });

        // Simpan ke database plain text
        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        
        console.log(`✅ Berhasil diposting ke Threads: ${target.title}`);
    } catch (err) {
        const errorData = err.response?.data || err.message;
        console.error('❌ Threads Gagal:', JSON.stringify(errorData, null, 2));
        process.exit(1);
    }
}

postToThreads();
