import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-patreon.txt';
const BASE_URL = 'https://dalam.web.id';

const slugify = (text) =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

async function postToPatreon() {
  const ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
  const CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

  if (!ACCESS_TOKEN || !CAMPAIGN_ID) {
    console.error('❌ Patreon token atau campaign ID belum diset');
    process.exit(1);
  }

  if (!fs.existsSync(JSON_FILE)) return;

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

  let postedDatabase = fs.existsSync(DATABASE_FILE)
    ? fs.readFileSync(DATABASE_FILE, 'utf8')
    : "";

  let allPosts = [];

  // --- KUMPULKAN ARTIKEL YANG BELUM DIPOST ---
  for (const [cat, posts] of Object.entries(data)) {
    const catSlug = slugify(cat);

    posts.forEach(p => {
      const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
      const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}/`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: p[0],
          url: fullUrl,
          image: p[2],
          date: p[3],
          desc: p[4] || "Artikel terbaru dari dalam.web.id"
        });
      }
    });
  }

  // --- SORTING TERBARU ---
  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  if (allPosts.length === 0) {
    console.log("🏁 Patreon: Semua artikel sudah dipost.");
    return;
  }

  const target = allPosts[0];

  console.log(`🚀 Posting ke Patreon: ${target.title}`);

  try {
    await axios.post(
  'https://www.patreon.com/api/posts',
  {
    data: {
      type: 'post',
      attributes: {
        title: target.title,
        content: `
${target.desc}

🔗 Kupas Tuntas di:
${target.url}
        `,
        is_public: true
      },
      relationships: {
        campaign: {
          data: {
            type: 'campaign',
            id: CAMPAIGN_ID
          }
        }
      }
    }
  },
  {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }
);

    if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
    fs.appendFileSync(DATABASE_FILE, target.url + '\n');

    console.log(`✅ Patreon sukses! "${target.title}" sudah tayang.`);
  } catch (err) {
    console.error(
      '❌ Patreon Error:',
      JSON.stringify(err.response?.data || err.message, null, 2)
    );
    process.exit(1);
  }
}

postToPatreon();
