import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-patreon.txt';
const BASE_URL = 'https://dalam.web.id';

const slugify = (text) =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

async function postToPatreon() {
  const ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
  const CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID || "15483016"; // Pakai ID yang sudah kita temukan tadi

  if (!ACCESS_TOKEN) {
    console.error('❌ Patreon token belum diset');
    process.exit(1);
  }

  if (!fs.existsSync(JSON_FILE)) {
    console.error('❌ File artikel.json tidak ditemukan');
    return;
  }

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  let postedDatabase = fs.existsSync(DATABASE_FILE) ? fs.readFileSync(DATABASE_FILE, 'utf8') : "";
  let allPosts = [];

  for (const [cat, posts] of Object.entries(data)) {
    const catSlug = slugify(cat);
    posts.forEach(p => {
      const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
      const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}/`;

      if (!postedDatabase.includes(fileSlug)) {
        allPosts.push({
          title: p[0],
          slug: fileSlug, // Kita simpan slug saja di db biar rapi
          url: fullUrl,
          date: p[3],
          desc: p[4] || "Artikel terbaru dari dalam.web.id"
        });
      }
    });
  }

  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  if (allPosts.length === 0) {
    console.log("🏁 Patreon: Semua artikel sudah dipost.");
    return;
  }

  const target = allPosts[0];
  console.log(`🚀 Posting ke Patreon: ${target.title}`);

  try {
    const response = await axios.post(
      'https://www.patreon.com/api/oauth2/v2/posts', // URL diperbaiki ke v2
      {
        data: {
          type: 'post',
          attributes: {
            title: target.title,
            content: `<p>${target.desc}</p><p>🔗 Kupas Tuntas di: <a href="${target.url}">${target.url}</a></p>`,
            is_public: true,
            publish_state: 'published'
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
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/vnd.api+json', // Wajib ini!
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
    // Simpan slug saja ke database agar pengecekan lebih akurat
    fs.appendFileSync(DATABASE_FILE, target.slug + '\n');

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
