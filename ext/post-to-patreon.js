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
    console.error('❌ Token atau Campaign ID belum diset di ENV');
    process.exit(1);
  }

  if (!fs.existsSync(JSON_FILE)) return;

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
          slug: fileSlug,
          url: fullUrl,
          date: p[3],
          desc: p[4] || "Kupas tuntas di Layar Kosong."
        });
      }
    });
  }

  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  if (allPosts.length === 0) {
    console.log("🏁 Semua artikel sudah terupdate.");
    return;
  }

  const target = allPosts[0];
  console.log(`🚀 Mengirim ke Patreon v2: ${target.title}`);

  // STRUKTUR PAYLOAD JSON:API V2 YANG BENAR
  const payload = {
    data: {
      type: 'post',
      attributes: {
        title: target.title,
        content: `<p>${target.desc}</p><p>Baca selengkapnya di: <a href="${target.url}">${target.url}</a></p>`,
        is_public: true,
        publish_state: 'published' // Memaksa langsung tayang
      },
      relationships: {
        campaign: {
          data: {
            type: 'campaign',
            id: String(CAMPAIGN_ID) // ID harus string
          }
        }
      }
    }
  };

  try {
    const response = await axios({
      method: 'post',
      // KITA COBA RUTE ALTERNATIF TANPA OAUTH2 PREFIX
      url: 'https://www.patreon.com/api/v2/posts',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      },
      data: payload
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`✅ SUKSES! "${target.title}" sudah tayang.`);
      if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
      fs.appendFileSync(DATABASE_FILE, target.slug + '\n');
    }
  } catch (err) {
    // JIKA MASIH 404, KITA COBA RUTE LAMA DENGAN STRUKTUR BARU
    if (err.response?.status === 404) {
        console.log("🔄 Rute v2/posts 404, mencoba rute kampanye v2 dengan payload yang sama...");
        try {
            const retryResponse = await axios({
                method: 'post',
                url: `https://www.patreon.com/api/oauth2/v2/campaigns/${CAMPAIGN_ID}/posts`,
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/vnd.api+json'
                },
                data: payload
            });
            console.log(`✅ SUKSES LEWAT RUTE CADANGAN!`);
            fs.appendFileSync(DATABASE_FILE, target.slug + '\n');
            return;
        } catch (retryErr) {
            console.error('❌ Semua rute gagal.');
        }
    }

    console.error('❌ Detail Error:', JSON.stringify(err.response?.data || err.message, null, 2));
    process.exit(1);
  }
}

postToPatreon();
