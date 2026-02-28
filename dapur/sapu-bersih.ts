import { Octokit } from "@octokit/core";

/**
 * Script ini menggunakan GitHub GraphQL API v4
 * Pastikan GITHUB_TOKEN memiliki scope 'write:discussion'
 */

const token = Bun.env.GITHUB_TOKEN;
const repoEnv = Bun.env.GITHUB_REPOSITORY;

if (!token || !repoEnv) {
  console.error("❌ Error: GITHUB_TOKEN dan GITHUB_REPOSITORY harus ada di ENV.");
  process.exit(1);
}

const [owner, repo] = repoEnv.split('/');
const octokit = new Octokit({ auth: token });

async function nukeAllDiscussions() {
  try {
    console.log(`🧹 Memulai pembersihan diskusi di ${owner}/${repo}...`);

    // 1. Ambil diskusi (menggunakan GraphQL)
    const getQuery = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          discussions(first: 100) {
            nodes { id title }
          }
        }
      }
    `;

    const res: any = await octokit.graphql(getQuery, { owner, name: repo });
    const discussions = res.repository.discussions.nodes;

    if (discussions.length === 0) {
      console.log('✅ Bersih! Tidak ada diskusi yang ditemukan.');
      return;
    }

    console.log(`📝 Menemukan ${discussions.length} diskusi. Menghapus satu per satu...`);

    // 2. Hapus diskusi secara berurutan
    // Kita gunakan loop biasa agar tidak terkena Rate Limit GitHub jika terlalu banyak
    for (const disc of discussions) {
      process.stdout.write(`🗑️ Menghapus: ${disc.title.slice(0, 50)}... `);

      await octokit.graphql(`
        mutation($id: ID!) {
          deleteDiscussion(input: {id: $id}) { clientMutationId }
        }
      `, { id: disc.id });

      console.log("✅ OK");
    }

    console.log(`\n♻️ Selesai! Berhasil menghapus ${discussions.length} diskusi.`);
    console.log(`💡 Jika diskusi kamu > 100, jalankan script ini sekali lagi.`);

  } catch (err: any) {
    if (err.message.includes("401")) {
      console.error("❌ Token tidak valid atau expired.");
    } else {
      console.error("❌ Gagal nuklir diskusi:", err.message);
    }
  }
}

nukeAllDiscussions();
