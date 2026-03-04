import { XMLParser } from 'fast-xml-parser';
import { Octokit } from "@octokit/core";
import fs from 'node:fs';
import path from 'node:path';

// --- KONFIGURASI ---
const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';
const TRACKER_FILE = 'mini/posted-github.txt';
const RSS_FILES = [
  'feed-gaya-hidup.xml', 'feed-jejak-sejarah.xml', 'feed-lainnya.xml',
  'feed-olah-media.xml', 'feed-opini-sosial.xml',
  'feed-sistem-terbuka.xml', 'feed-warta-tekno.xml'
];

// Inisialisasi Octokit & Parser
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  try {
    console.log("🚀 Memulai sinkronisasi GitHub Discussions (Bun Optimized)...");

    // 1. Pastikan folder dan file tracker tersedia
    const dir = path.dirname(TRACKER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(TRACKER_FILE)) fs.writeFileSync(TRACKER_FILE, '');

    const postedSlugs = new Set(
      fs.readFileSync(TRACKER_FILE, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
    );

    // 2. Ambil ID Repo dan Daftar Kategori Discussion
    const repoRes = await octokit.graphql(`
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          discussionCategories(first: 25) { nodes { id name } }
        }
      }
    `, { owner: REPO_OWNER, name: REPO_NAME });

    const repoId = repoRes.repository.id;
    const ghCategories = repoRes.repository.discussionCategories.nodes;

    let allArticles = [];

    // 3. Iterasi file RSS
    for (const fileName of RSS_FILES) {
      if (!fs.existsSync(fileName)) {
        console.warn(`⚠️ Skip: ${fileName} tidak ditemukan.`);
        continue;
      }
      
      const xmlData = fs.readFileSync(fileName, 'utf8');
      const jsonObj = parser.parse(xmlData);
      
      const channel = jsonObj?.rss?.channel;
      if (!channel) continue;

      // Ekstraksi nama kategori dari Title RSS (Contoh: "Kategori Warta Tekno - Layar Kosong")
      const rawCategory = channel.title.split(' - ')[0].replace(/Kategori\s+/i, '').trim();
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) {
        console.warn(`⚠️ Kategori GitHub "${rawCategory}" belum dibuat di Discussions.`);
        continue;
      }

      const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

      items.forEach(item => {
        const link = item.link || "";
        const urlParts = link.split('/').filter(Boolean);
        const slug = urlParts[urlParts.length - 1];
        
        if (slug && !postedSlugs.has(slug)) {
          // Cari gambar dari enclosure atau media:content
          const imageUrl = item.enclosure?.url || item['media:content']?.url || null;

          allArticles.push({
            title: item.title,
            link: link,
            description: item.description || "",
            image: imageUrl,
            slug: slug,
            targetCategoryId: targetCategory.id,
            categoryName: rawCategory,
            pubDateParsed: new Date(item.pubDate || Date.now()).getTime() 
          });
        }
      });
    }

    // 4. Sortir Artikel: Terlama -> Terbaru agar urutan timeline benar
    allArticles.sort((a, b) => a.pubDateParsed - b.pubDateParsed);
    console.log(`📦 Ditemukan ${allArticles.length} artikel baru.`);

    // 5. Eksekusi Posting
    for (const art of allArticles) {
      console.log(`📤 Posting [${art.categoryName}]: ${art.title}`);

      let displayImage = '';
      if (art.image) {
        // Optimasi: Gunakan raw link GitHub jika gambar berasal dari domain sendiri
        if (art.image.includes('dalam.web.id')) {
          const relativePath = art.image.replace(/https?:\/\/dalam.web.id\//, '');
          displayImage = `\n\n![Thumbnail](https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${relativePath})`;
        } else {
          displayImage = `\n\n![Thumbnail](${art.image})`;
        }
      }

      const footer = `\n\n---\n**Baca selengkapnya di:** [${art.link}](${art.link})`;
      const bodyContent = `### [${art.title}](${art.link})${displayImage}\n\n${art.description}${footer}`;

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
          body: bodyContent
        });

        // Simpan slug ke tracker segera setelah berhasil
        postedSlugs.add(art.slug);
        fs.writeFileSync(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
        
        console.log(`✅ Sukses: ${art.slug}`);
        await sleep(2500); // Jeda sedikit lebih lama agar aman dari spam filter GitHub

      } catch (err) {
        console.error(`❌ Gagal di ${art.slug}:`, err.message);
        // Lanjut ke artikel berikutnya jika satu gagal
      }
    }

    console.log("\n✨ Sinkronisasi selesai!");

  } catch (err) {
    console.error("❌ Kesalahan Fatal:", err.message);
    process.exit(1);
  }
}

// Jalankan script
if (import.meta.main || process.env.NODE_ENV === 'test') {
  run();
}
