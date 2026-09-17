// --- BUN NATIVE API - RSS 2.0 PARSER ---
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';
const TRACKER_FILE = 'mini/posted-github.txt';

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
  targetCategoryId: string;
  categoryName: string;
  pubDateParsed: number;
}

const GITHUB_TOKEN = Bun.env.GITHUB_TOKEN;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function githubGraphQL(query: string, variables: any = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Bun-Runtime-LayarKosong"
    },
    body: JSON.stringify({ query, variables })
  });

  const result: any = await response.json();
  
  if (!response.ok || result.errors) {
    const errorMsg = result.errors ? JSON.stringify(result.errors) : `${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return result.data;
}

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

async function run() {
  console.log("🚀 Memulai sinkronisasi RSS via Bun Native...");

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

    const repoRes: any = await githubGraphQL(`
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          discussionCategories(first: 25) { nodes { id name } }
        }
      }
    `, { owner: REPO_OWNER, name: REPO_NAME });

    const repoId = repoRes.repository.id;
    const ghCategories = repoRes.repository.discussionCategories.nodes;
    const allArticles: Article[] = [];

    for (const fileName of RSS_FILES) {
      const file = Bun.file(fileName);
      if (!(await file.exists())) {
        console.warn(`⚠️ File ${fileName} tidak ditemukan, melewatinya...`);
        continue;
      }

      const xmlData = await file.text();
      const { title: channelTitle, items } = parseRSSSafe(xmlData);

      const rawCategory = channelTitle.split(' - ')[0].replace(/Kategori\s+/i, '').trim();
      const targetCategory = ghCategories.find((c: any) => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) {
        console.warn(`⚠️ Kategori GitHub tidak ditemukan untuk: ${rawCategory}`);
        continue;
      }

      for (const item of items) {
        const slug = item.link.split('/').filter(Boolean).pop();
        if (slug && !postedSlugs.has(slug)) {
          allArticles.push({
            ...item,
            slug,
            targetCategoryId: targetCategory.id,
            categoryName: rawCategory,
            pubDateParsed: new Date(item.pubDate || Date.now()).getTime()
          });
        }
      }
    }

    allArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);
    console.log(`📦 Terdeteksi ${allArticles.length} artikel baru yang siap dipublish.`);

    for (const art of allArticles) {
      if (!art.title) {
        console.warn(`⚠️ Melewati artikel tanpa judul (slug: ${art.slug})`);
        continue;
      }

      // Potong judul jika melebihi batas 240 karakter (Maksimal GitHub = 256)
      const safeTitle = art.title.length > 240 ? `${art.title.slice(0, 237)}...` : art.title;

      console.log(`📤 Posting ke GitHub: ${safeTitle}`);

      let displayImage = "";
      if (art.image) {
        const imgUrl = art.image.includes('dalam.web.id')
          ? art.image.replace(/https?:\/\/dalam.web.id\//, `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`)
          : art.image;
        displayImage = `\n\n![Thumbnail](${imgUrl})`;
      }

      const bodyContent = `### [${art.title}](${art.link})${displayImage}\n\n${art.description}\n\n---\n**Kupas Tuntas semuanya di:** [${art.link}](${art.link})`;

      try {
        await githubGraphQL(`
          mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!) {
            createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, body: $body, title: $title }) {
              discussion { id }
            }
          }
        `, {
          repoId,
          catId: art.targetCategoryId,
          title: safeTitle,
          body: bodyContent
        });

        // Catat tracker hanya jika posting sukses
        postedSlugs.add(art.slug);
        await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
        
        // Jeda 5 detik per postingan untuk menghindari secondary rate limit
        await sleep(5000);

      } catch (postError: any) {
        console.error(`❌ Gagal posting "${safeTitle}":`, postError.message);

        // Jika terkena Secondary Rate Limit / Spam detection, beri jeda panjang lalu lanjut
        if (postError.message.includes("secondary rate limit") || postError.message.includes("403") || postError.message.includes("WAS_SUBMITTED_TOO_QUICKLY")) {
          console.warn("⏳ Terkena Secondary Rate Limit GitHub. Mengistirahatkan skrip selama 40 detik...");
          await sleep(40000);
        }
      }
    }

    console.log("✨ Done! Proses sinkronisasi selesai.");

  } catch (err: any) {
    console.error("❌ Fatal Error:", err.message);
    process.exit(1);
  }
}

run();
