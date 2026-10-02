// --- BUN NATIVE API - ARTIKEL.JSON TO GITHUB GIST ---
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TRACKER_FILE = 'mini/posted-gist.txt'; // Tracker terpisah khusus Gist
const ARTIKEL_JSON = 'artikel.json'; // Sumber data utama
const MAX_PER_CATEGORY = 4; // Batas 4 post per kategori per run workflow

interface Article {
  title: string;
  link: string;
  description: string;
  image: string | null;
  slug: string;
  categoryName: string;
  pubDateParsed: number;
}

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
    const categoryArticlesMap: Record<string, Article[]> = {};
    let totalUnpostedDetected = 0;

    // 3. Parser khusus struktur artikel.json
    // Key = Nama Kategori, Value = Array dari [title, rawSlug, image, pubDate, description]
    for (const [categoryName, items] of Object.entries(rawData)) {
      if (!Array.isArray(items)) continue;

      const categoryList: Article[] = [];

      for (const item of items) {
        let title = '';
        let rawSlug = '';
        let image: string | null = null;
        let pubDate = '';
        let description = '';

        if (Array.isArray(item)) {
          // Unpack elemen array [title, slug, image, pubDate, description]
          [title, rawSlug, image, pubDate, description] = item;
        } else if (typeof item === 'object' && item !== null) {
          // Fallback jika suatu saat ada format Object
          title = (item as any).title || (item as any).judul || '';
          rawSlug = (item as any).slug || (item as any).link || (item as any).url || '';
          image = (item as any).image || (item as any).thumbnail || null;
          pubDate = (item as any).pubDate || (item as any).date || '';
          description = (item as any).description || (item as any).summary || '';
        }

        if (!title || !rawSlug) continue;

        // Ekstrak & bersihkan slug (hilangkan ekstensi .html jika ada)
        const cleanSlug = rawSlug.split('/').filter(Boolean).pop()?.replace(/\.html$/i, '') || rawSlug;
        const fullLink = rawSlug.startsWith('http') ? rawSlug : `https://dalam.web.id/${rawSlug.replace(/^\//, '')}`;

        // Cek apakah slug belum pernah diposting ke Gist
        if (cleanSlug && !postedSlugs.has(cleanSlug)) {
          categoryList.push({
            title,
            link: fullLink,
            description: description || '',
            image: image || null,
            slug: cleanSlug,
            categoryName,
            pubDateParsed: new Date(pubDate || Date.now()).getTime()
          });
        }
      }

      if (categoryList.length > 0) {
        totalUnpostedDetected += categoryList.length;

        // Urutkan dari artikel terlama ke terbaru berdasarkan tanggal publikasi
        categoryList.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

        categoryArticlesMap[categoryName] = categoryList;
      }
    }

    // 4. Ambil maksimal 4 artikel terlama per kategori
    const articlesToPost: Article[] = [];

    for (const categoryList of Object.values(categoryArticlesMap)) {
      const selected = categoryList.slice(0, MAX_PER_CATEGORY);
      articlesToPost.push(...selected);
    }

    // Urutkan gabungan seluruh antrean kronologis agar pengiriman rapi
    articlesToPost.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

    console.log(`📦 Terdeteksi ${totalUnpostedDetected} artikel baru belum terposting di ${ARTIKEL_JSON}.`);
    console.log(`🎯 Menyiapkan ${articlesToPost.length} artikel baru (maksimal ${MAX_PER_CATEGORY} artikel per kategori) yang siap di-upload ke Gist.`);

    // 5. Eksekusi Upload ke GitHub Gist
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

        // Catat slug yang sukses ke tracker
        postedSlugs.add(art.slug);
        await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
        
        // Jeda 5 detik antar request untuk menghindari rate limit GitHub
        await sleep(800);

      } catch (postError: any) {
        console.error(`❌ Gagal upload Gist "${safeTitle}":`, postError.message);

        // Penanganan secondary rate limit GitHub API
        if (postError.message.includes("secondary rate limit") || postError.message.includes("403") || postError.message.includes("submitted too quickly")) {
          console.warn("⏳ Terkena Rate Limit GitHub. Mengistirahatkan skrip selama 40 detik...");
          await sleep(1000);
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
