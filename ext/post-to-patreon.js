import fs from 'fs';
import axios from 'axios';

const JSON_FILE = 'artikel.json';
const DATABASE_FILE = 'mini/posted-patreon.txt';
const BASE_URL = 'https://dalam.web.id';

const slugify = (text) =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

import axios from 'axios';

async function checkAndPost() {
  const token = process.env.PATREON_ACCESS_TOKEN;
  const camp_id = "15483016";

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/vnd.api+json'
  };

  try {
    // 1. Tes dulu: Apakah token ini bisa melihat info kampanye?
    console.log("🔍 Mengecek izin token...");
    const check = await axios.get('https://www.patreon.com/api/oauth2/v2/campaigns', { headers });

    if (check.status === 200) {
      console.log("✅ Token valid! Mencoba posting...");

      const payload = {
        data: {
          type: 'post',
          attributes: {
            title: "CachyOS 2026: Era Baru Wayland",
            content: "<p>Artikel terbaru sudah tayang di Layar Kosong!</p>",
            is_public: true,
            publish_state: 'published'
          },
          relationships: {
            campaign: {
              data: { type: 'campaign', id: camp_id }
            }
          }
        }
      };

      const res = await axios.post('https://www.patreon.com/api/oauth2/v2/posts', payload, { headers });
      console.log("🚀 SUKSES! Postingan sudah terbit.");
    }
  } catch (err) {
    console.error("❌ Gagal:", err.response?.data || err.message);
    console.log("\n💡 ANALISA: Jika masih 404, artinya token kamu masih 'None' (tanpa scope).");
  }
}

checkAndPost();
