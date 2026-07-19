// --- BUN NATIVE API - RSS 2.0 PARSER ---
// Tanpa dependensi eksternal, dieksekusi dengan Bun Runtime
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';
const TRACKER_FILE = 'mini/posted-github.txt';

// File asli menggunakan ekstensi .rss
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

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
  }

  const result: any = await response.json();
  if (result.errors) throw new Error(JSON.stringify(result.errors, null, 2));
  return result.data;
}

function extractMatch(text: string, regex: RegExp): string {
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Custom RSS 2.0 Parser
 * Dirancang khusus untuk membaca format <item> dan <![CDATA[ ]]>
 */
function parseRSSSafe(xml: string) {
  const items: any[] = [];
  
  // Ambil judul channel (Kategori)
  let channelTitle = extractMatch(xml, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
  if (!channelTitle) channelTitle = extractMatch(xml, /<title>([^<]+)<\/title>/i);
  
  // Pisahkan berdasarkan <item>
  const rawItems = xml.split("<item>");
  rawItems.shift(); // Buang bagian header channel

  for (const rawItem of rawItems) {
    const content = rawItem.split("</item>")[0];
    
    // Title sering dibungkus CDATA di filemu
    let title = extractMatch(content, /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i);
    if (!title) title = extractMatch(content, /<title>([\s\S]*?)<\/title>/i);
    
    const link = extractMatch(content, /<link>([^<]+)<\/link>/i);
    const pubDate = extractMatch(content, /<pubDate>([^<]+)<\/pubDate>/i);
    
    // Ambil gambar dari tag <enclosure url="..." />
    const imageUrl = extractMatch(content, /<enclosure[^>]*url="([^"]+)"/i) || null;

    // Ambil deskripsi UTUH dari dalam CDATA
    let description = extractMatch(content, /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i);
    if (!description) description = extractMatch(content, /<description>([\s\S]*?)<\/description>/i);

    items.push({
      title,
      link,
      description,
      pubDate,
      image: imageUrl
    });
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
        // Karena link dari RSS berbentuk https://dalam.web.id/kategori/slug
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

    // Urutkan dari terlama ke terbaru
    allArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);
    console.log(`📦 Terdeteksi ${allArticles.length} artikel baru yang siap dipublish.`);

    for (const art of allArticles) {
      console.log(`📤 Posting ke GitHub: ${art.title}`);

      let displayImage = "";
      if (art.image) {
        const imgUrl = art.image.includes('dalam.web.id')
          ? art.image.replace(/https?:\/\/dalam.web.id\//, `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`)
          : art.image;
        displayImage = `\n\n![Thumbnail](${imgUrl})`;
      }

      const bodyContent = `### [${art.title}](${art.link})${displayImage}\n\n${art.description}\n\n---\n**Kupas Tuntas semuanya di:** [${art.link}](${art.link})`;

      await githubGraphQL(`
        mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!) {
          createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, body: $body, title: $title }) {
            discussion { id }
          }
        }
      `, {
        repoId,
        catId: art.targetCategoryId,
        title: art.title,
        body: bodyContent
      });

      postedSlugs.add(art.slug);
      await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
      
      await sleep(2500); 
    }

    console.log("✨ Done! Semua sinkronisasi RSS 2.0 berhasil.");

  } catch (err: any) {
    console.error("❌ Fatal Error:", err.message);
    process.exit(1);
  }
}

run();
