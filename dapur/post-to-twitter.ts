import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Parser from 'rss-parser';
import * as fs from 'fs';

puppeteer.use(StealthPlugin());
const parser = new Parser();

// Konfigurasi
const RSS_URL = 'https://dalam.web.id/feed';
const LOG_FILE = 'last_post.txt';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runAutoPoster() {
    try {
        // 1. Ambil Artikel Terbaru
        let feed = await parser.parseURL(RSS_URL);
        if (feed.items.length === 0) return;

        const latestPost = feed.items[0];
        const postText = `Ada artikel baru nih: ${latestPost.title}\n\nLangsung sikat di sini 👇\n${latestPost.link}`;

        // 2. Cek riwayat postingan (File ini nanti akan di-commit balik oleh GitHub Actions)
        if (fs.existsSync(LOG_FILE)) {
            const lastUrl = fs.readFileSync(LOG_FILE, 'utf-8');
            if (lastUrl === latestPost.link) {
                console.log('✅ Artikel ini sudah diposting sebelumnya. Skip.');
                return;
            }
        }

        console.log(`🚀 Menyiapkan postingan baru: ${latestPost.title}`);

        // 3. Baca Cookies dari Environment Variables (GitHub Secrets)
        const cookiesEnv = process.env.TWITTER_COOKIES;
        if (!cookiesEnv) {
            throw new Error('❌ Secret TWITTER_COOKIES belum diset!');
        }
        const cookies = JSON.parse(cookiesEnv);

        // 4. Eksekusi Browser Headless
        const browser = await puppeteer.launch({
            headless: true,
            // Argumen wajib untuk GitHub Actions (Ubuntu Environment)
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        // 5. Inject Cookies
        await page.setCookie(...cookies);

        // 6. Masuk ke halaman Compose
        await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
        await delay(3000);

        // 7. Mengetik ala manusia
        const textBoxSelector = '[data-testid="tweetTextarea_0"]';
        await page.waitForSelector(textBoxSelector);
        await page.click(textBoxSelector);
        await page.type(textBoxSelector, postText, { delay: 120 });

        await delay(2000);

        // 8. Klik Post
        const postButtonSelector = '[data-testid="tweetButton"]';
        await page.waitForSelector(postButtonSelector);
        await page.click(postButtonSelector);

        console.log('🎉 Cuitan berhasil dikirim!');

        // 9. Update state lokal untuk di-commit oleh GitHub Actions
        await delay(5000);
        fs.writeFileSync(LOG_FILE, latestPost.link);

        await browser.close();

    } catch (error) {
        console.error('❌ Terjadi kesalahan:', error);
        process.exit(1); // Agar GitHub Actions mendeteksi ini sebagai kegagalan
    }
}

runAutoPoster();