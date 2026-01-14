const Parser = require('rss-parser');
const { Octokit } = require("@octokit/core");
const fs = require('fs');

const parser = new Parser();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const RSS_FILES = [
  'feed-gaya-hidup.xml', 'feed-jejak-sejarah.xml', 'feed-lainnya.xml',
  'feed-olah-media.xml', 'feed-opini-sosial.xml', 
  'feed-sistem-terbuka.xml', 'feed-warta-tekno.xml'
];

const REPO_OWNER = 'frijal';
const REPO_NAME = 'LayarKosong';

// Fungsi untuk membuat warna HEX acak untuk label baru
const getRandomColor = () => Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

async function run() {
  try {
    // 1. Ambil Data Dasar Repo
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
      if (!fs.existsSync(fileName)) continue;
      const feed = await parser.parseString(fs.readFileSync(fileName, 'utf8'));
      const rawCategory = feed.title.split(' - ')[0].trim();
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) continue;

      for (const item of feed.items) {
        // --- LOGIKA LABEL OTOMATIS ---
        // Kita ambil kategori dari RSS dan kata kunci tambahan dari judul (opsional)
        let keywords = item.categories || [rawCategory];
        let labelIds = [];

        for (let kw of keywords) {
          let existingLabel = ghLabels.find(l => l.name.toLowerCase() === kw.toLowerCase());
          
          if (!existingLabel) {
            console.log(`🎨 Membuat label baru: ${kw}`);
            const newLabel = await octokit.request('POST /repos/{owner}/{repo}/labels', {
              owner: REPO_OWNER,
              repo: REPO_NAME,
              name: kw,
              color: getRandomColor(),
              description: `Otomatis dari kategori ${kw}`
            });
            existingLabel = { id: newLabel.data.node_id, name: kw };
            ghLabels.push(existingLabel); // Simpan di memori biar gak buat double
          }
          labelIds.push(existingLabel.id);
        }

        // --- CEK DUPLIKAT & POSTING ---
        const checkRes = await octokit.graphql(`
          query($owner: String!, $name: String!, $link: String!) {
            repository(owner: $owner, name: $name) {
              discussions(first: 1, query: $link) { totalCount }
            }
          }
        `, { owner: REPO_OWNER, name: REPO_NAME, link: item.link });

        if (checkRes.repository.discussions.totalCount === 0) {
          console.log(`🚀 Posting: ${item.title} dengan labels: [${keywords.join(', ')}]`);

          await octokit.graphql(`
            mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!, $labelIds: [ID!]) {
              createDiscussion(input: {
                repositoryId: $repoId, 
                categoryId: $catId, 
                body: $body, 
                title: $title,
                labelIds: $labelIds
              }) {
                discussion { url }
              }
            }
          `, {
            repoId: repoId,
            catId: targetCategory.id,
            title: item.title,
            labelIds: labelIds,
            body: `### [${item.title}](${item.link})\n\n${item.description || ''}\n\n---\n*Kategori: ${rawCategory}*`
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

run();
