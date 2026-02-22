import { read } from 'feed-reader'; // Library baru
import { Octokit } from "@octokit/core";
import fs from 'fs';
import path from 'path';

// Kita tidak perlu "new Parser()" lagi karena 'read' adalah fungsi langsung
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const RSS_FILES = [
  'feed-gaya-hidup.xml', 'feed-jejak-sejarah.xml', 'feed-lainnya.xml',
  'feed-olah-media.xml', 'feed-opini-sosial.xml',
  'feed-sistem-terbuka.xml', 'feed-warta-tekno.xml'
];

const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';
const TRACKER_FILE = 'mini/posted-github.txt';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  try {
    console.log("🎨 Memulai sinkronisasi Layar Kosong (Modern Feed Engine)...");

    const dir = path.dirname(TRACKER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(TRACKER_FILE)) fs.writeFileSync(TRACKER_FILE, '');

    const postedSlugs = new Set(
      fs.readFileSync(TRACKER_FILE, 'utf8').split('\n').map(s => s.trim()).filter(s => s !== '')
    );

    const repoRes = await octokit.graphql(`
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          discussionCategories(first: 20) { nodes { id name } }
        }
      }
    `, { owner: REPO_OWNER, name: REPO_NAME });

    const repoId = repoRes.repository.id;
    const ghCategories = repoRes.repository.discussionCategories.nodes;

    let allArticles = [];

    for (const fileName of RSS_FILES) {
      if (!fs.existsSync(fileName)) continue;
      
      const xmlData = fs.readFileSync(fileName, 'utf8');
      // Feed-reader menggunakan fungsi 'read' yang bisa menerima string XML atau URL
      const feed = await read(xmlData); 
      
      // Mengambil nama kategori dari title (Layar Kosong - Kategori X)
      const rawCategory = feed.title.split(' - ')[0].replace('Kategori ', '').trim();
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) continue;

      // 'feed.entries' adalah pengganti 'feed.items' di library lama
      feed.entries.forEach(item => {
        const urlParts = item.link.split('/');
        const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        
        if (!postedSlugs.has(slug)) {
          allArticles.push({
            title: item.title,
            link: item.link,
            description: item.description || item.content,
            enclosure: item.enclosures ? item.enclosures[0] : null, // Struktur sedikit berbeda
            slug: slug,
            targetCategoryId: targetCategory.id,
            categoryName: rawCategory,
            pubDateParsed: new Date(item.published).getTime() 
          });
        }
      });
    }

    allArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);
    console.log(`📦 Ditemukan ${allArticles.length} artikel baru.`);

    let count = 0;
    for (const art of allArticles) {
      count++;
      console.log(`🚀 [${count}/${allArticles.length}] Posting: ${art.title}`);

      let displayImage = '';
      // Penyesuaian pengecekan enclosure (gambar)
      if (art.enclosure && art.enclosure.url) {
        let imgUrl = art.enclosure.url;
        const relativePath = imgUrl.replace('https://dalam.web.id/', '');
        displayImage = imgUrl.startsWith('https://dalam.web.id/') 
          ? `\n\n![Thumbnail](https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${relativePath})`
          : `\n\n![Thumbnail](${imgUrl})`;
      }

      const footer = `\n\n---\n**Baca selengkapnya di:** [${art.link}](${art.link})`;

      try {
        await octokit.graphql(`
          mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!) {
            createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, body: $body, title: $title }) {
              discussion { id }
            }
          }
        `, {
          repoId: repoId,
          catId: art.targetCategoryId,
          title: art.title,
          body: `### [${art.title}](${art.link})${displayImage}\n\n${art.description || ''}${footer}`
        });

        postedSlugs.add(art.slug);
        fs.writeFileSync(TRACKER_FILE, Array.from(postedSlugs).join('\n'));

        await sleep(2000); 

      } catch (err) {
        console.error(`❌ Gagal di ${art.slug}:`, err.message);
      }
    }

    console.log("\n✅ Sinkronisasi selesai!");

  } catch (err) {
    console.error("❌ Kesalahan Fatal:", err.message);
  }
}

run();
