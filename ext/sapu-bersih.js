import { Octokit } from "@octokit/core";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

async function deleteAll() {
  try {
    console.log(`🧹 Memulai pembersihan diskusi di ${owner}/${repo}`);
    
    const query = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          discussions(first: 500) {
            nodes { id title }
          }
        }
      }
    `;

    const res = await octokit.graphql(query, { owner, name: repo });
    const discussions = res.repository.discussions.nodes;

    if (discussions.length === 0) {
      console.log('✅ Tidak ada diskusi yang tersisa.');
      return;
    }

    for (const disc of discussions) {
      console.log(`🗑️ Menghapus: ${disc.title}`);
      await octokit.graphql(`
        mutation($id: ID!) {
          deleteDiscussion(input: {id: $id}) { clientMutationId }
        }
      `, { id: disc.id });
    }
    
    console.log(`♻️ Berhasil menghapus ${discussions.length} diskusi. Jalankan lagi jika masih ada sisa.`);
  } catch (err) {
    console.error("❌ Error saat menghapus:", err.message);
  }
}

deleteAll();
