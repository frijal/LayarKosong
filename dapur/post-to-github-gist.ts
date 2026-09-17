// --- BUN NATIVE API - RSS TO GITHUB GIST ---
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TRACKER_FILE = 'mini/posted-gist.txt'; // Tracker terpisah khusus Gist
const MAX_PER_CATEGORY = 5; // Batas 5 post per kategori (7 kategori x 5 = maks 35 post per run)

const RSS_FILES = [
  'gaya-hidup.rss', 'jejak-sejarah.rss', 'lainnya.rss',
  'olah-media.rss', 'opini-sosial.rss',
  'sistem-terbuka.rss', 'warta-tekno.rss'
];

interface Article {
  title: string;
  link: string;
  description: string;
  image: string | null;
  slug: string;
  categoryName: string;
  pubDateParsed: number;
}

const GITHUB_TOKEN = Bun.env.GITHUB_TOKEN;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extractMatch(text: string, regex: RegExp): string {
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function parseRSSSafe(xml: string) {
  const items: any[] = [];
  
  let channelTitle = extractMatch(xml, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
  if (!channelTitle) channelTitle = extractMatch(xml, /<title>([^<]+)<\/title>/i);
  
  const rawItems = xml.split("<item>");
  rawItems.shift();

  for (const rawItem of rawItems) {
    const content = rawItem.split("</item>")[0];
    
    let title = extractMatch(content, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
    if (!title) title = extractMatch(content, /<title>([\s\S]*?)<\/title>/i);
    
    const link = extractMatch(content, /<link>([^<]+)<\/link>/i);
    const pubDate = extractMatch(content, /<pubDate>([^<]+)<\/pubDate>/i);
    const imageUrl = extractMatch(content, /<enclosure[^>]*url="([^"]+)"/i) || null;

    let description = extractMatch(content, /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i);
    if (!description) description = extractMatch(content, /<description>([\s\S]*?)<\/description>/i);

    items.push({ title, link, description, pubDate, image: imageUrl });
  }
  
  return { title: channelTitle, items };
}

// Fungsi membuat Gist via REST API v3
async function createGist(description: string, filename: string, content: string, isPublic = true) {
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "Bun-Runtime-LayarKosong"
    },
    body: JSON.stringify({
      description,
      public: isPublic,
      files: {
        [filename]: { content }
      }
    })
  });

  const result: any = await response.json();
  
  if (!response.ok) {
    const errorMsg = result.message || `${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return result;
}

async function run() {
  console.log("🚀 Memulai sinkronisasi RSS ke GitHub Gist...");

  if (!GITHUB_TOKEN) {
    console.error("❌ GITHUB_TOKEN tidak ditemukan di Environment.");
    process.exit(1);
  }

  try {
    await mkdir(dirname(TRACKER_FILE), { recursive: true });

    const trackerFile = Bun.file(TRACKER_FILE);
    let postedSlugs = new Set<string>();

    if (await trackerFile.exists()) {
      const text = await trackerFile.text();
      postedSlugs = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
    }

    const articlesToPost: Article[] = [];
    let totalUnpostedDetected = 0;

    // Filter dan batasi 5 artikel terlama per kategori
    for (const fileName of RSS_FILES) {
      const file = Bun.file(fileName);
      if (!(await file.exists())) {
        console.warn(`⚠️ File ${fileName} tidak ditemukan, melewatinya...`);
        continue;
      }

      const xmlData = await file.text();
      const { title: channelTitle, items } = parseRSSSafe(xmlData);
      const rawCategory = channelTitle.split(' - ')[0].replace(/Kategori\s+/i, '').trim();

      const categoryArticles: Article[] = [];

      for (const item of items) {
        const slug = item.link.split('/').filter(Boolean).pop();
        if (slug && !postedSlugs.has(slug)) {
          categoryArticles.push({
            ...item,
            slug,
            categoryName: rawCategory,
            pubDateParsed: new Date(item.pubDate || Date.now()).getTime()
          });
        }
      }

      totalUnpostedDetected += categoryArticles.length;

      // Urutkan artikel dalam kategori dari yang terlama
      categoryArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

      // Ambil maksimal 5 artikel untuk kategori ini
      const selected = categoryArticles.slice(0, MAX_PER_CATEGORY);
      articlesToPost.push(...selected);
    }

    // Urutkan gabungan seluruh antrean agar postingan berjalan teratur secara kronologis
    articlesToPost.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

    console.log(`📦 Terdeteksi ${totalUnpostedDetected} artikel baru secara keseluruhan.`);
    console.log(`🎯 Menyiapkan ${articlesToPost.length} artikel baru (maksimal 5 artikel per kategori) yang siap di-upload ke Gist.`);

    for (const art of articlesToPost) {
      if (!art.title) {
        console.warn(`⚠️ Melewati artikel tanpa judul (slug: ${art.slug})`);
        continue;
      }

      const safeTitle = art.title.length > 240 ? `${art.title.slice(0, 237)}...` : art.title;
      const filename = `${art.slug}.md`;

      console.log(`📤 Upload ke Gist [${art.categoryName}]: ${safeTitle}`);

      let displayImage = "";
      if (art.image) {
        const imgUrl = art.image.includes('dalam.web.id')
          ? art.image.replace(/https?:\/\/dalam.web.id\//, `https://raw.githubusercontent.com/frijal/LayarKosong/main/`)
          : art.image;
        displayImage = `\n\n![Thumbnail](${imgUrl})`;
      }

      // Format Markdown untuk isi Gist
      const bodyContent = `# [${art.title}](${art.link})\n\n> **Kategori:** ${art.categoryName}  \n> **Sumber:** [${art.link}](${art.link})${displayImage}\n\n${art.description}\n\n---\n*terkirim otomatis dari halaman [Layar Kosong](https://dalam.web.id)*`;

      try {
        const gistResult = await createGist(
          safeTitle,
          filename,
          bodyContent,
          true
        );

        console.log(`✅ Berhasil! Gist URL: ${gistResult.html_url}`);

        postedSlugs.add(art.slug);
        await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
        
        // Jeda 5 detik antar request untuk mencegah rate limit
        await sleep(5000);

      } catch (postError: any) {
        console.error(`❌ Gagal upload Gist "${safeTitle}":`, postError.message);

        // Penanganan jika hits secondary rate limit GitHub
        if (postError.message.includes("secondary rate limit") || postError.message.includes("403") || postError.message.includes("submitted too quickly")) {
          console.warn("⏳ Terkena Rate Limit GitHub. Mengistirahatkan skrip selama 40 detik...");
          await sleep(40000);
        }
      }
    }

    console.log("✨ Done! Sinkronisasi Gist selesai.");

  } catch (err: any) {
    console.error("❌ Fatal Error:", err.message);
    process.exit(1);
  }
}

run();
