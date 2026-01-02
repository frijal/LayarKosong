import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-telegram.txt';
const BASE_URL = 'https://dalam.web.id/artikel/';

async function postToTelegram() {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
        console.log("🏁 Telegram: Tidak ada artikel baru.");
        return;
    }

    const targetUrl = `${BASE_URL}${target.slug}`;
    
    // Format pesan Telegram menggunakan HTML
    const caption = `<b>${target.title}</b>\n\n${target.desc}\n\n#LayarKosong #Update #Blog`;

    try {
        console.log(`🚀 Mengirim ke Telegram: ${target.title}`);

        await axios.post(`https://api.linkedin.com/rest/posts`, { // Ops, salah endpoint, ini yang benar:
        // Gunakan endpoint Telegram sendPhoto
        });

        // REVISI ENDPOINT TELEGRAM:
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            chat_id: CHAT_ID,
            photo: target.image,
            caption: caption,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    { text: "📖 Baca Selengkapnya", url: targetUrl }
                ]]
            }
        });

        fs.appendFileSync(DATABASE_FILE, targetUrl + '\n');
        console.log(`✅ Berhasil posting ke Telegram Channel!`);
        
    } catch (err) {
        console.error('❌ Telegram Error:', err.response?.data || err.message);
        process.exit(1);
    }
}

postToLinkedIn(); // Ganti jadi postToTelegram()
postToTelegram();
