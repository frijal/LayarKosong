/* =====================
 * Interface & Config
 * ===================== */
const BLOG_NAME = "frijal";
const CONSUMER_KEY = Bun.env.TUMBLR_CONSUMER_KEY!;
const TOKEN = Bun.env.TUMBLR_TOKEN!;

// Note: API v2 Tumblr bisa menggunakan OAuth1.0a,
// tapi untuk script simpel, paling mudah pakai Bearer atau Consumer Key.
// Jika kamu ingin 100% replacement yang aman,
// kita gunakan struktur Fetch API.

async function postToTumblr(target: any) {
  const url = `https://api.tumblr.com/v2/blog/${BLOG_NAME}.tumblr.com/posts`;

  const tags = ["fediverse", "Repost", "Ngopi", "Indonesia", target.category]
    .map(t => t.replace(/&/g, "dan").replace(/[^\w\s]/g, "").trim())
    .join(",");

  // Konstruksi body untuk API Tumblr v2
  const formData = new URLSearchParams();
  formData.append("type", "link");
  formData.append("url", target.url);
  formData.append("description", target.desc);
  formData.append("tags", tags);
  formData.append("api_key", CONSUMER_KEY);

  console.log(`🚀 Mengirim ke Tumblr via Native Fetch: ${target.title}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        // Jika pakai OAuth, tambahkan Authorization header di sini
        // Tapi Tumblr mengizinkan api_key + token untuk beberapa endpoint
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Gagal post: ${JSON.stringify(data)}`);
    }

    console.log("✅ Berhasil post ke Tumblr!");
    return data;
  } catch (err) {
    console.error("❌ Error Tumblr:", err);
    throw err;
  }
}
