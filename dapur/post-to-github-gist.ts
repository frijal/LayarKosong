// --- BUN NATIVE API - ARTIKEL.JSON TO GITHUB GIST ---
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TRACKER_FILE = 'mini/posted-gist.txt'; // Tracker terpisah khusus Gist
const ARTIKEL_JSON = 'artikel.json'; // Sumber data utama menggantikan RSS
const MAX_PER_CATEGORY = 4; // Batas 4 post per kategori (7 kategori x 4 = maks 28 post per run)

interface Article {
  title: string;
  link: string;
  description: string;
  image: string | null;
  slug: string;
  categoryName: string;
  pubDateParsed: number;
}

// Mendukung GITHUB_TOKEN atau GIST_TOKEN dari environment
const GITHUB_TOKEN = Bun.env.GITHUB_TOKEN || Bun.env.GIST_TOKEN;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi membuat Gist via REST API v3 GitHub
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
  console.log("🚀 Memulai sinkronisasi artikel.json ke GitHub Gist...");

  if (!GITHUB_TOKEN) {
    console.error("❌ GITHUB_TOKEN / GIST_TOKEN tidak ditemukan di Environment.");
    process.exit(1);
  }

  try {
    await mkdir(dirname(TRACKER_FILE), { recursive: true });

    // 1. Baca tracker slug yang sudah pernah terposting
    const trackerFile = Bun.file(TRACKER_FILE);
    let postedSlugs = new Set<string>();

    if (await trackerFile.exists()) {
      const text = await trackerFile.text();
      postedSlugs = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
    }

    // 2. Baca file artikel.json
    const jsonFile = Bun.file(ARTIKEL_JSON);
    if (!(await jsonFile.exists())) {
      console.error(`❌ File ${ARTIKEL_JSON} tidak ditemukan!`);
      process.exit(1);
    }

    const rawData = await jsonFile.json();
    
    // Normalisasi struktur JSON (dukung Array maupun Object per kategori)
    let allRawArticles: any[] = [];
    if (Array.isArray(rawData)) {
      allRawArticles = rawData;
    } else if (typeof rawData === 'object' && rawData !== null) {
      for (const [catName, items] of Object.entries(rawData)) {
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            allRawArticles.push({ ...it, category: it.category || catName });
          });
        }
      }
    }

    // Filter artikel yang belum terposting & kelompokkan per Kategori
    const categorizedArticles: Record<string, Article[]> = {};
    let totalUnpostedDetected = 0;

    for (const item of allRawArticles) {
      let slug = item.slug;
      if (!slug && item.link) {
        slug = item.link.split('/').filter(Boolean).pop();
      }

      if (!slug || postedSlugs.has(slug)) {
        continue;
      }

      const categoryName = item.category || item.categoryName || 'Lainnya';
      const pubDate = item.pubDate || item.date || item.created_at || Date.now();
      const link = item.link || item.url || `https://dalam.web.id/${slug}`;
      const description = item.description || item.summary || item.content || '';
      const image = item.image || item.thumbnail || item.enclosure || null;

      const articleObj: Article = {
        title: item.title || '',
        link,
        description,
        image,
        slug,
        categoryName,
        pubDateParsed: new Date(pubDate).getTime() || Date.now()
      };

      if (!categorizedArticles[categoryName]) {
        categorizedArticles[categoryName] = [];
      }

      categorizedArticles[categoryName].push(articleObj);
      totalUnpostedDetected++;
    }

    // 3. Ambil maksimal 4 artikel terlama dari tiap kategori
    const articlesToPost: Article[] = [];

    for (const [catName, articles] of Object.entries(categorizedArticles)) {
      // Urutkan artikel dalam kategori dari yang paling lama
      articles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

      // Ambil maksimal 4 artikel per kategori
      const selected = articles.slice(0, MAX_PER_CATEGORY);
      articlesToPost.push(...selected);
    }

    // Urutkan gabungan seluruh antrean secara kronologis agar posting teratur
    articlesToPost.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

    console.log(`📦 Terdeteksi ${totalUnpostedDetected} artikel baru secara keseluruhan di ${ARTIKEL_JSON}.`);
    console.log(`🎯 Menyiapkan ${articlesToPost.length} artikel baru (maksimal ${MAX_PER_CATEGORY} artikel per kategori) yang siap di-upload ke Gist.`);

    // 4. Eksekusi Upload ke GitHub Gist
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

        // Catat slug yang sukses terposting ke tracker
        postedSlugs.add(art.slug);
        await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
        
        // Jeda 5 detik antar request untuk mencegah rate limit
        await sleep(5000);

      } catch (postError: any) {
        console.error(`❌ Gagal upload Gist "${safeTitle}":`, postError.message);

        // Penanganan jika terkena secondary rate limit GitHub
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
