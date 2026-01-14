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
    const ghCategories = repoRes.repository.id ? repoRes.repository.discussionCategories.nodes : [];
    let ghLabels = repoRes.repository.labels.nodes;

    for (const fileName of RSS_FILES) {
      if (!fs.existsSync(fileName)) continue;

      const feed = await parser.parseString(fs.readFileSync(fileName, 'utf8'));
      const rawCategory = feed.title.split(' - ')[0].trim();
      const targetCategory = ghCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase());

      if (!targetCategory) continue;

      for (const item of feed.items) {
        // 1. CEK DUPLIKAT
        const searchQuery = `repo:${REPO_OWNER}/${REPO_NAME} is:discussion "${item.link}"`;
        const checkRes = await octokit.graphql(`
        query($searchQuery: String!) {
          search(query: $searchQuery, type: DISCUSSION, first: 1) { discussionCount }
        }
        `, { searchQuery: searchQuery });

        if (checkRes.search.discussionCount > 0) continue;

        // 2. LOGIKA LABEL
        const itemCategory = item.categories && item.categories[0] ? item.categories[0] : rawCategory;
        let existingLabel = ghLabels.find(l => l.name.toLowerCase() === itemCategory.toLowerCase());

        if (!existingLabel) {
          try {
            const newLabel = await octokit.request('POST /repos/{owner}/{repo}/labels', {
              owner: REPO_OWNER, repo: REPO_NAME, name: itemCategory, color: getRandomColor()
            });
            existingLabel = { id: newLabel.data.node_id, name: itemCategory };
            ghLabels.push(existingLabel);
          } catch (e) { }
        }

        // --- 3. LOGIKA GAMBAR (AMBIL PATH UTUH) ---
        let displayImage = '';
        if (item.enclosure && item.enclosure.url) {
          let imgUrl = item.enclosure.url;
          // Menghilangkan https://dalam.web.id agar menjadi img/folder/file.ext
          const relativePath = imgUrl.replace('https://dalam.web.id/', '');
          displayImage = `\n\n![Thumbnail](${relativePath})`;
        }

        console.log(`🚀 Posting: ${item.title}`);
        const footer = `\n\n---\n**Baca selengkapnya di:** [${item.link}](${item.link})`;

        const createRes = await octokit.graphql(`
        mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!) {
          createDiscussion(input: {
            repositoryId: $repoId, categoryId: $catId, body: $body, title: $title
          }) { discussion { id } }
        }
        `, {
          repoId: repoId,
          catId: targetCategory.id,
          title: item.title,
          body: `### [${item.title}](${item.link})${displayImage}\n\n${item.contentSnippet || item.description || ''}${footer}`
        });

        // 4. TAMBAHKAN LABEL
        if (existingLabel && createRes.createDiscussion.discussion.id) {
          try {
            await octokit.graphql(`
            mutation($labelableId: ID!, $labelIds: [ID!]!) {
              addLabelsToLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) { clientMutationId }
            }
            `, {
              labelableId: createRes.createDiscussion.discussion.id,
              labelIds: [existingLabel.id]
            });
          } catch (e) { }
        }
      }
    }
    console.log("\n✅ Selesai!");
  } catch (err) {
    console.error("❌ Kesalahan:", err.message);
  }
}

run();