import Parser from 'rss-parser';
import { Octokit } from "@octokit/core";
import fs from 'fs';

const parser = new Parser();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const RSS_FILES = [
  'feed-gaya-hidup.xml', 'feed-jejak-sejarah.xml', 'feed-lainnya.xml',
'feed-olah-media.xml', 'feed-opini-sosial.xml',
'feed-sistem-terbuka.xml', 'feed-warta-tekno.xml'
];

const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';

const getRandomColor = () => Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

async function run() {
  try {
    console.log("🔍 Memulai sinkronisasi...");

    const repoRes = await octokit.graphql(`
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 20) { nodes { id name } }
        labels(first: 100) { nodes { id name } }
      }
    }
    `, { owner: REPO_OWNER, name: REPO_NAME });

    const repoId = repoRes.repository.id;
    const ghCategories = repoRes.repository.discussionCategories.nodes;
    let ghLabels = repoRes.repository.labels.nodes;

    for (const fileName of RSS_FILES) {
      if (!fs.existsSync(fileName)) {
        console.log(`ℹ️ File ${fileName} tidak ditemukan, skip.`);
        continue;
      }

      const feed = await parser.parseString(fs.readFileSync(fileName, 'utf8'));
      const rawCategory = feed.title.split(' - ')[0].trim();

      // Cari kategori yang cocok di GitHub
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) {
        console.log(`⚠️ Kategori "${rawCategory}" belum dibuat di GitHub Discussions. Silakan buat manual.`);
        continue;
      }

      console.log(`\n📂 Memproses Kategori: ${targetCategory.name}`);

      for (const item of feed.items) {
        // --- 1. CEK DUPLIKAT ---
        const searchQuery = `repo:${REPO_OWNER}/${REPO_NAME} is:discussion "${item.link}"`;
        const checkRes = await octokit.graphql(`
        query($searchQuery: String!) {
          search(query: $searchQuery, type: DISCUSSION, first: 1) {
            discussionCount
          }
        }
        `, { searchQuery: searchQuery });

        if (checkRes.search.discussionCount > 0) {
          continue;
        }

        // --- 2. LOGIKA LABEL ---
        const itemCategory = item.categories && item.categories[0] ? item.categories[0] : rawCategory;
        let existingLabel = ghLabels.find(l => l.name.toLowerCase() === itemCategory.toLowerCase());
        let labelIds = [];

        if (!existingLabel) {
          try {
            console.log(`🎨 Membuat label baru: ${itemCategory}`);
            const newLabel = await octokit.request('POST /repos/{owner}/{repo}/labels', {
              owner: REPO_OWNER, repo: REPO_NAME, name: itemCategory, color: getRandomColor()
            });
            existingLabel = { id: newLabel.data.node_id, name: itemCategory };
            ghLabels.push(existingLabel);
          } catch (e) {
            console.log(`🟡 Gagal buat label ${itemCategory}, kemungkinan sudah ada.`);
          }
        }
        if (existingLabel) labelIds.push(existingLabel.id);

        // --- 3. POSTING DISKUSI ---
        console.log(`🚀 Posting: ${item.title}`);
        const thumbnail = item.enclosure ? `\n\n![Thumbnail](${item.enclosure.url})` : '';
        const footer = `\n\n---\n**Baca selengkapnya di:** [${item.link}](${item.link})\n\n☕ *Dukung melalui [PayPal.me/FakhrulRijal](https://paypal.me/FakhrulRijal)*`;

        await octokit.graphql(`
        mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!, $labelIds: [ID!]) {
          createDiscussion(input: {
            repositoryId: $repoId, categoryId: $catId, body: $body, title: $title, labelIds: $labelIds
          }) { discussion { url } }
        }
        `, {
          repoId: repoId,
          catId: targetCategory.id,
          title: item.title,
          labelIds: labelIds,
          body: `### [${item.title}](${item.link})${thumbnail}\n\n${item.contentSnippet || item.description || ''}${footer}`
        });
      }
    }
    console.log("\n✅ Sinkronisasi Berhasil!");
  } catch (err) {
    console.error("❌ Terjadi Kesalahan:");
    if (err.errors) {
      err.errors.forEach(e => console.error(`- ${e.message}`));
    } else {
      console.error(err.message);
    }
  }
}

run();