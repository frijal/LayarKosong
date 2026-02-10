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

// Fungsi bantu
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomColor = () => Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

async function run() {
  try {
    console.log("🛠️ Memulai sinkronisasi dengan sistem Tracker Lokal...");

    // 1. Pastikan folder & file tracker ada
    const dir = path.dirname(TRACKER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(TRACKER_FILE)) fs.writeFileSync(TRACKER_FILE, '');

    // 2. Baca daftar slug yang sudah pernah di-post
    const postedSlugs = new Set(
      fs.readFileSync(TRACKER_FILE, 'utf8')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s !== '')
    );
    console.log(`✅ Terdeteksi ${postedSlugs.size} artikel sudah pernah diposting sebelumnya.`);

    // 3. Ambil data Repo & Kategori dari GitHub (Sekali saja di awal)
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

    let newlyPostedCount = 0;

    // 4. Looping Feed
    for (const fileName of RSS_FILES) {
      if (!fs.existsSync(fileName)) continue;

      const feed = await parser.parseString(fs.readFileSync(fileName, 'utf8'));
      const rawCategory = feed.title.split(' - ')[0].replace('Kategori ', '').trim();
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) continue;

      for (const item of feed.items) {
        // Ambil Slug
        const urlParts = item.link.split('/');
        const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];

        // --- CEK DI TRACKER LOKAL (Bukan di API GitHub) ---
        if (postedSlugs.has(slug)) {
          // console.log(`⏭️ Skip: ${slug} (Sudah ada di catatan)`);
          continue;
        }

        console.log(`🚀 Posting Baru: ${item.title}`);

        // Logika Gambar
        let displayImage = '';
        if (item.enclosure && item.enclosure.url) {
          let imgUrl = item.enclosure.url;
          const relativePath = imgUrl.replace('https://dalam.web.id/', '');
          displayImage = imgUrl.startsWith('https://dalam.web.id/') 
            ? `\n\n![Thumbnail](https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${relativePath})`
            : `\n\n![Thumbnail](${imgUrl})`;
        }

        try {
          // Eksekusi Post
          const footer = `\n\n---\n**Baca selengkapnya di:** [${item.link}](${item.link})`;
          await octokit.graphql(`
            mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!) {
              createDiscussion(input: { repositoryId: $repoId, categoryId: $catId, body: $body, title: $title }) {
                discussion { id }
              }
            }
          `, {
            repoId: repoId,
            catId: targetCategory.id,
            title: item.title,
            body: `### [${item.title}](${item.link})${displayImage}\n\n${item.contentSnippet || item.description || ''}${footer}`
          });

          // Masukkan ke catatan (Set) jika berhasil
          postedSlugs.add(slug);
          newlyPostedCount++;

          // Simpan ulang file catatan setiap kali ada update (supaya aman kalau crash)
          fs.writeFileSync(TRACKER_FILE, Array.from(postedSlugs).join('\n'));

          // Jeda sedikit biar sopan
          await sleep(1000); 

        } catch (err) {
          console.error(`❌ Gagal posting ${slug}:`, err.message);
        }
      }
    }

    if (newlyPostedCount > 0) {
      console.log(`\n🎉 Selesai! Berhasil menambah ${newlyPostedCount} postingan baru.`);
    } else {
      console.log("\n☕ Tidak ada artikel baru. Catatan lokal sudah sinkron dengan RSS.");
    }

  } catch (err) {
    console.error("❌ Kesalahan Fatal:", err.message);
  }
}

run();
