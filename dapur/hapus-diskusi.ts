// --- HAPUS MASSAL GITHUB DISCUSSIONS VIA GRAPHQL ---
const GITHUB_TOKEN = Bun.env.GITHUB_TOKEN;
const REPO_OWNER = "frijal"; // Ganti jika beda
const REPO_NAME = "LayarKosong";   // Ganti jika beda

if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN tidak ditemukan!");
  process.exit(1);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchDiscussions(cursor: string | null = null) {
  const query = `
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        discussions(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Bun-Delete-Discussions"
    },
    body: JSON.stringify({
      query,
      variables: { owner: REPO_OWNER, name: REPO_NAME, cursor }
    })
  });

  const result: any = await response.json();
  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }

  return result.data.repository.discussions;
}

async function deleteDiscussion(discussionId: string, title: string) {
  const mutation = `
    mutation($input: DeleteDiscussionInput!) {
      deleteDiscussion(input: $input) {
        discussion {
          id
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Bun-Delete-Discussions"
    },
    body: JSON.stringify({
      query: mutation,
      variables: { input: { id: discussionId } }
    })
  });

  const result: any = await response.json();
  if (result.errors) {
    console.error(`❌ Gagal hapus "${title}":`, result.errors[0].message);
    return false;
  }

  console.log(`🗑️ Berhasil dihapus: ${title}`);
  return true;
}

async function run() {
  console.log("🚀 Memulai pembersihan massal GitHub Discussions...");

  let hasNextPage = true;
  let cursor: string | null = null;
  let totalDeleted = 0;

  while (hasNextPage) {
    try {
      const data = await fetchDiscussions(cursor);
      const nodes = data.nodes;
      hasNextPage = data.pageInfo.hasNextPage;
      cursor = data.pageInfo.endCursor;

      if (nodes.length === 0) {
        console.log("✨ Tidak ada diskusi lagi yang ditemukan.");
        break;
      }

      for (const disc of nodes) {
        await deleteDiscussion(disc.id, disc.title);
        totalDeleted++;
        // Jeda 1 detik agar tidak kena rate limit GraphQL
        await sleep(1000);
      }

    } catch (err: any) {
      console.error("❌ Terjadi kesalahan:", err.message);
      break;
    }
  }

  console.log(`\n🎉 Selesai! Total ${totalDeleted} diskusi berhasil dibersihkan dari repo.`);
}

run();
