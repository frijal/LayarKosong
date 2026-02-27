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

const octokit = new Octokit({ auth: Bun.env.GITHUB_TOKEN });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Pengganti Parser: Lebih stabil dari Regex RegExp()
 * Memakai split untuk menghindari error "unmatched parentheses"
 */
function extractTag(content: string, tag: string): string {
  const startTag = `<${tag}>`;
  const endTag = `</${tag}>`;
  const parts = content.split(startTag);
  if (parts.length < 2) return "";
  const val = parts[1].split(endTag)[0];
  
  // Bersihkan CDATA jika ada
  return val.replace("<![CDATA[", "").replace("]]>", "").trim();
}

function parseRSSSafe(xml: string) {
  const items: any[] = [];
  
  // Ambil judul channel
  const channelTitle = extractTag(xml, "title");

  // Pecah per item
  const rawItems = xml.split("<item>");
  rawItems.shift(); // Buang bagian sebelum item pertama

  for (const rawItem of rawItems) {
    const content = rawItem.split("</item>")[0];
    
    // Cari image URL secara manual di string
    let imageUrl: string | null = null;
    const imgMatch = content.match(/url="([^"]+)"/);
    if (imgMatch) imageUrl = imgMatch[1];

    const description = extractTag(content, "description")
      .replace(/<[^>]*>?/gm, '') // Hapus tag HTML
      .substring(0, 300);

    items.push({
      title: extractTag(content, "title"),
      link: extractTag(content, "link"),
      description: description + "...",
      pubDate: extractTag(content, "pubDate"),
      image: imageUrl
    });
  }

  return { title: channelTitle, items };
}

async function run() {
  console.log("🚀 Memulai sinkronisasi Bun + TS (Safe Manual Parser)...");

  try {
    const trackerFile = Bun.file(TRACKER_FILE);
    let postedSlugs = new Set<string>();
    
    if (await trackerFile.exists()) {
      const text = await trackerFile.text();
      postedSlugs = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
    }

    // GraphQL Query
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

    for (const fileName of RSS_FILES) {
      const file = Bun.file(fileName);
      if (!(await file.exists())) {
        console.warn(`⚠️ File ${fileName} tidak ada.`);
        continue;
      }
      
      const xmlData = await file.text();
      const { title: channelTitle, items } = parseRSSSafe(xmlData);

      const rawCategory = channelTitle.split(' - ')[0].replace(/Kategori\s+/i, '').trim();
      const targetCategory = ghCategories.find((c: any) => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) continue;

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
    console.log(`📦 Terdeteksi ${allArticles.length} artikel baru.`);

    for (const art of allArticles) {
      console.log(`📤 Posting ke GitHub: ${art.title}`);

      let displayImage = "";
      if (art.image) {
        const imgUrl = art.image.includes('dalam.web.id')
          ? art.image.replace(/https?:\/\/dalam.web.id\//, `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/`)
          : art.image;
        displayImage = `\n\n![Thumbnail](${imgUrl})`;
      }

      const bodyContent = `### [${art.title}](${art.link})${displayImage}\n\n${art.description}\n\n---\n**Baca selengkapnya di:** [Layar Kosong](${art.link})`;

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

      postedSlugs.add(art.slug);
      await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
      
      await sleep(2500); 
    }

    console.log("✨ Done! Semua lancar jaya.");

  } catch (err: any) {
    console.error("❌ Fatal Error:", err.message);
    process.exit(1);
  }
}

run();
