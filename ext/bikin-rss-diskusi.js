import Parser from 'rss-parser';
import { Octokit } from "@octokit/core";
import fs from 'fs';
import path from 'path';

const parser = new Parser();
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
    console.log("🎨 Memulai sinkronisasi dengan urutan variasi kategori...");

    // 1. Setup Tracker
    const dir = path.dirname(TRACKER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(TRACKER_FILE)) fs.writeFileSync(TRACKER_FILE, '');

    const postedSlugs = new Set(
      fs.readFileSync(TRACKER_FILE, 'utf8').split('\n').map(s => s.trim()).filter(s => s !== '')
    );

    // 2. Ambil Info Repo
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

    // 3. Kumpulkan SEMUA artikel dari SEMUA file ke satu Array besar
    let allArticles = [];

    for (const fileName of RSS_FILES) {
      if (!fs.existsSync(fileName)) continue;
      
      const feed = await parser.parseString(fs.readFileSync(fileName, 'utf8'));
      const rawCategory = feed.title.split(' - ')[0].replace('Kategori ', '').trim();
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) continue;

      feed.items.forEach(item => {
        const urlParts = item.link.split('/');
        const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        
        // Hanya masukkan yang BELUM pernah di-post
        if (!postedSlugs.has(slug)) {
          allArticles.push({
            ...item,
            slug: slug,
            targetCategoryId: targetCategory.id,
            categoryName: rawCategory,
            // Simpan tanggal dalam format angka untuk pengurutan
            pubDateParsed: new Date(item.pubDate).getTime() 
          });
        }
      });
    }

    // 4. URUTKAN: Kita urutkan berdasarkan tanggal (dari yang terlama ke terbaru)
    // Supaya pas tampil di GitHub Discussion, yang PALING BARU muncul paling atas.
    allArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);

    console.log(`📦 Ditemukan ${allArticles.length} artikel baru yang siap diposting secara bervariasi.`);

    // 5. Eksekusi Posting satu per satu
    let count = 0;
    for (const art of allArticles) {
      count++;
      console.log(`🚀 [${count}/${allArticles.length}] Posting dari kategori [${art.categoryName}]: ${art.title}`);

      // Logika Gambar
      let displayImage = '';
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
          body: `### [${art.title}](${art.link})${displayImage}\n\n${art.contentSnippet || art.description || ''}${footer}`
        });

        // Update Tracker secara real-time
        postedSlugs.add(art.slug);
        fs.writeFileSync(TRACKER_FILE, Array.from(postedSlugs).join('\n'));

        // Jeda 2 detik biar nggak dianggap brutal oleh GitHub
        await sleep(2000); 

      } catch (err) {
        console.error(`❌ Gagal di ${art.slug}:`, err.message);
      }
    }

    console.log("\n✅ Semua artikel baru telah diposting dengan urutan yang rapi!");

  } catch (err) {
    console.error("❌ Kesalahan Fatal:", err.message);
  }
}

run();
