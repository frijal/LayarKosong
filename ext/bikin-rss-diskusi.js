import Parser from "rss-parser";

const parser = new Parser();

/**
 * Daftar RSS kategori
 * (ubah URL sesuai struktur situsmu)
 */
const feeds = [
  {
    key: "gaya-hidup",
    url: "https://dalam.web.id/feed-gaya-hidup.xml"
  },
  {
    key: "jejak-sejarah",
    url: "https://dalam.web.id/feed-jejak-sejarah.xml"
  },
  {
    key: "lainnya",
    url: "https://dalam.web.id/feed-lainnya.xml"
  },
  {
    key: "olah-media",
    url: "https://dalam.web.id/feed-olah-media.xml"
  },
  {
    key: "opini-sosial",
    url: "https://dalam.web.id/feed-opini-sosial.xml"
  },
  {
    key: "sistem-terbuka",
    url: "https://dalam.web.id/feed-sistem-terbuka.xml"
  },
  {
    key: "warta-tekno",
    url: "https://dalam.web.id/feed-warta-tekno.xml"
  }
];

/**
 * Ambil nama kategori dari feed
 */
function extractCategory(feed) {
  // Prioritas 1: channel title
  if (feed.title) {
    return feed.title.split(" - ")[0].trim();
  }

  // Fallback: item category
  if (feed.items?.length) {
    const cat = feed.items[0].categories?.[0];
    if (cat) return cat.trim();
  }

  return "Tanpa Kategori";
}

/**
 * Baca satu RSS feed
 */
async function readFeed(feedConfig) {
  const feed = await parser.parseURL(feedConfig.url);

  const category = extractCategory(feed);

  const items = feed.items.map(item => ({
    title: item.title,
    url: item.link,
    guid: item.guid || item.link,
    published: item.isoDate || item.pubDate,
    summary: item.contentSnippet || ""
  }));

  return {
    key: feedConfig.key,
    category,
    feedTitle: feed.title,
    count: items.length,
    items
  };
}

/**
 * MAIN
 */
(async () => {
  for (const feedConfig of feeds) {
    try {
      const data = await readFeed(feedConfig);

      console.log("====================================");
      console.log(`RSS Key     : ${data.key}`);
      console.log(`Kategori    : ${data.category}`);
      console.log(`Feed Title  : ${data.feedTitle}`);
      console.log(`Jumlah Item : ${data.count}`);

      if (data.items.length > 0) {
        console.log("Contoh Item :");
        console.log({
          title: data.items[0].title,
          url: data.items[0].url
        });
      }
    } catch (err) {
      console.error(`Gagal membaca feed ${feedConfig.key}`);
      console.error(err.message);
    }
  }
})();
