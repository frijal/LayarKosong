import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-threads.txt';
// Base URL utama tanpa folder /artikel/
const DOMAIN_URL = 'https://dalam.web.id';

// Fungsi untuk memberi jeda waktu
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const slugify = (text) =>
text.toLowerCase().trim().replace(/\s+/g, '-');

async function postToThreads() {
    const ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
    const THREADS_USER_ID = process.env.THREADS_USER_ID;
    const API_BASE = 'https://graph.threads.net/v1.0';

    if (!fs.existsSync(JSON_FILE)) return;

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts = [];

    // --- LOAD DATABASE (Cek sebagai String Besar untuk pencarian Slug) ---
    let postedDatabase = fs.existsSync(DATABASE_FILE)
    ? fs.readFileSync(DATABASE_FILE, 'utf8')
    : "";

    // --- LOGIKA PENGUMPULAN DATA V6.9 ---
    for (const [cat, posts] of Object.entries(data)) {
        const catSlug = slugify(cat); // Gaya Hidup -> gaya-hidup

        posts.forEach(p => {
            const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
            // Bentuk URL Baru: https://dalam.web.id/kategori/slug/
            const fullUrl = `${DOMAIN_URL}/${catSlug}/${fileSlug}`;

            // Cek apakah slug sudah ada di dalam database teks
            if (!postedDatabase.includes(fileSlug)) {
                allPosts.push({
                    title: p[0],
                    url: fullUrl,
                    slug: fileSlug,
                    date: p[3],
                    desc: p[4] || "",
                    category: cat
                });
            }
        });
    }

    // --- SORTING TERBARU DULUAN ---
    allPosts.sort((a, b) => b.date.localeCompare(a.date));

    if (allPosts.length === 0) {
        console.log("🏁 Threads: Semua artikel sudah terposting (berdasarkan cek slug).");
        return;
    }

    // Ambil artikel terbaru yang lolos filter
    const target = allPosts[0];

    try {
        console.log(`🚀 Menyiapkan Threads: ${target.title} (${target.date})`);

        // Step 1: Create Container
        const resContainer = await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads`, {
            media_type: 'TEXT',
            text: `${target.desc}\n\n#Repost`,
            link_attachment: target.url,
            access_token: ACCESS_TOKEN
        });

        const creationId = resContainer.data.id;
        console.log(`📦 Container ID: ${creationId}. Menunggu 10 detik...`);

        await delay(10000);

        // Step 2: Publish
        await axios.post(`${API_BASE}/${THREADS_USER_ID}/threads_publish`, {
            creation_id: creationId,
            access_token: ACCESS_TOKEN
        });

        // Simpan FULL URL ke database (biar record-nya lengkap, tapi tetap aman dicek via slug)
        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, target.url + '\n');

        console.log(`✅ Berhasil diposting ke Threads: ${target.title}`);
    } catch (err) {
        const errorData = err.response?.data || err.message;
        console.error('❌ Threads Gagal:', JSON.stringify(errorData, null, 2));
        process.exit(1);
    }
}

postToThreads();
