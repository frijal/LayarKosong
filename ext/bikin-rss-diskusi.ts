import { Octokit } from "@octokit/core";

// --- KONFIGURASI ---
const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';
const TRACKER_FILE = 'mini/posted-github.txt';
const RSS_FILES = [
  'feed-gaya-hidup.xml', 'feed-jejak-sejarah.xml', 'feed-lainnya.xml',
  'feed-olah-media.xml', 'feed-opini-sosial.xml',
  'feed-sistem-terbuka.xml', 'feed-warta-tekno.xml'
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

// Inisialisasi Octokit (Ambil dari Bun.env)
const octokit = new Octokit({ auth: Bun.env.GITHUB_TOKEN });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Pengganti fast-xml-parser: Simple RSS Parser menggunakan Regex
 * Karena kita hanya butuh data spesifik, cara ini jauh lebih ringan (0 dependency).
 */
function quickParseRSS(xml: string) {
  const items: any[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  // Ambil judul channel untuk kategori
  const channelTitle = xml.match(/<channel>[\s\S]*?<title>(.*?)<\/title>/)?.[1] || "";

  for (const match of itemMatches) {
    const content = match[1];
    const getTag = (tag: string) => content.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))?.[1] || "";
    const getCdata = (tag: string) => content.match(new RegExp(`<${tag}><\!\[CDATA\[([\s\S]*?)\]\]><\/${tag}>`))?.[1] || getTag(tag);
    
    // Cari image di enclosure atau media:content
    const imgMatch = content.match(/<(?:enclosure|media:content)[^>]*url="([^"]+)"/);

    items.push({
      title: getCdata("title"),
      link: getTag("link"),
      description: getCdata("description").replace(/<[^>]*>?/gm, '').substring(0, 300) + "...", // Clean HTML tags
      pubDate: getTag("pubDate"),
      image: imgMatch ? imgMatch[1] : null
    });
  }

  return { title: channelTitle, items };
}

async function run() {
  console.log("🚀 Memulai sinkronisasi Bun + TypeScript (Zero XML Dep)...");

  // 1. Load Tracker (Set asinkron)
  const trackerFile = Bun.file(TRACKER_FILE);
  let postedSlugs = new Set<string>();
  
  if (await trackerFile.exists()) {
    const text = await trackerFile.text();
    postedSlugs = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
  }

  // 2. Ambil ID Repo & Kategori
  try {
    const repoRes: any = await octokit.graphql(`
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

    // 3. Iterasi file RSS
    for (const fileName of RSS_FILES) {
      const file = Bun.file(fileName);
      if (!(await file.exists())) continue;
      
      const xmlData = await file.text();
      const { title: channelTitle, items } = quickParseRSS(xmlData);

      const rawCategory = channelTitle.split(' - ')[0].replace(/Kategori\s+/i, '').trim();
      const targetCategory = ghCategories.find((c: any) => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) {
        console.warn(`⚠️ Kategori "${rawCategory}" tidak ditemukan di GitHub.`);
        continue;
      }

      for (const item of items) {
        const slug = item.link.split('/').filter(Boolean).pop();
        
        if (slug && !postedSlugs.has(slug)) {
          allArticles.push({
            title: item.title,
            link: item.link,
            description: item.description,
            image: item.image,
            slug,
            targetCategoryId: targetCategory.id,
            categoryName: rawCategory,
            pubDateParsed: new Date(item.pubDate || Date.now()).getTime()
          });
        }
      }
    }

    // 4. Sortir & Posting
    allArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);
    console.log(`📦 Ada ${allArticles.length} artikel baru.`);

    for (const art of allArticles) {
      console.log(`📤 Posting: ${art.title}`);

      const displayImage = art.image 
        ? `\n\n![Thumbnail](${art.image.replace('dalam.web.id', `raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`)})`
        : '';

      const bodyContent = `### [${art.title}](${art.link})${displayImage}\n\n${art.description}\n\n---\n**Baca di:** [Layar Kosong](${art.link})`;

      await octokit.graphql(`
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

      // Update tracker langsung lewat Bun.write
      postedSlugs.add(art.slug);
      await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
      
      await sleep(2000); 
    }

    console.log("✨ Selesai, Om!");

  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
