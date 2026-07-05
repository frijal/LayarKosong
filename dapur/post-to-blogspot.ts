import nodemailer from "nodemailer";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-blogspot.txt", // Database terpisah khusus Blogspot Planet
  baseUrl: "https://dalam.web.id",[cite: 2, 7]

  // Ambil dari Bun.env
  smtpHost: Bun.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(Bun.env.SMTP_PORT || "465"),
  smtpUser: Bun.env.SMTP_USER!,
  smtpPassword: Bun.env.SMTP_PASSWORD!,
  blogPostEmail: Bun.env.BLOGSPOT_POST_EMAIL!, // Email rahasia username.keyword@blogger.com
};

/* =====================
 * Interfaces
 * ===================== */
// Struktur sesuai artikel.json: [judul, path, gambar, tanggal, deskripsi][cite: 7]
type RawArticle = [string, string, string, string, string?];
interface ArticleData {
  [category: string]: RawArticle[];
}

interface Article {
  title: string;
  url: string;
  slug: string;
  image: string;
  date: string;
  desc: string;
  category: string;
}

/* =====================
 * Utilities
 * ===================== */
const slugify = (text: string): string =>
  text.toLowerCase().trim().replace(/\s+/g, '-');

/* =====================
 * Main Logic
 * ===================== */
async function run(): Promise<void> {
  // Validasi Env
  if (!CONFIG.smtpUser || !CONFIG.smtpPassword || !CONFIG.blogPostEmail) {
    console.error("❌ Error: SMTP_USER, SMTP_PASSWORD, atau BLOGSPOT_POST_EMAIL belum diset.");
    process.exit(1);
  }

  const articleFile = Bun.file(CONFIG.articleFile);
  if (!(await articleFile.exists())) {
    console.error(`❌ Error: ${CONFIG.articleFile} tidak ditemukan.`);
    process.exit(1);
  }

  // Load Database pakai Bun.file[cite: 2]
  const dbFile = Bun.file(CONFIG.databaseFile);
  const postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

  const rawData = (await articleFile.json()) as ArticleData;
  let allArticles: Article[] = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, imageUrl, isoDate, description] = item;[cite: 7]
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');

      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      if (!postedDatabase.includes(fileSlug)) {
        allArticles.push({
          title,
          url: fullUrl,
          slug: fileSlug,
          image: imageUrl,[cite: 7]
          date: isoDate,
          desc: description || "Archive.",
          category
        });
      }
    }
  }

  // Urutkan berdasarkan tanggal terbaru
  allArticles.sort((a, b) => b.date.localeCompare(a.date));
  const target = allArticles[0];

  if (!target) {
    console.log("🏁 Blogspot Planet: Semua artikel sudah terposting.");
    return;
  }

  console.log(`🚀 Mengirim Email Post ke Blogspot Planet: ${target.title}`);

  /* =====================
   * Format Body Email (HTML Khusus Struktur Blogspot / Gmail)
   * ===================== */
  const emailContent = `
<div dir="ltr">
 <div>
  <div style="font-family:arial,sans-serif" class="gmail_default">
   ${target.desc}
  </div>
  <div style="font-family:arial,sans-serif" class="gmail_default">
   ${target.image ? `<img src="${target.image}" width="auto" height="auto">` : ""}<br><br>
  </div><br clear="all">
 </div>
 <div>
  <div style="font-family:arial,sans-serif" class="gmail_default">
   Baca artikel selengkapnya di: <a href="${target.url}">${target.url}</a>
  </div>
 </div>
</div>
`;

  /* =====================
   * Setup Nodemailer & Kirim
   * ===================== */
  const transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost,
    port: CONFIG.smtpPort,
    secure: CONFIG.smtpPort === 465,
    auth: {
      user: CONFIG.smtpUser,
      pass: CONFIG.smtpPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Layar Kosong Syndication" <${CONFIG.smtpUser}>`,
      to: CONFIG.blogPostEmail,
      subject: target.title, // Subject otomatis jadi Judul Postingan Blogspot
      html: emailContent,    // Body HTML format Gmail style
    });

    // Simpan Log pakai Bun.write[cite: 2]
    const newContent = postedDatabase + target.url + "\n";
    await Bun.write(CONFIG.databaseFile, newContent);

    console.log(`✅ Berhasil! Artikel terposting ke Blogspot.`);

  } catch (err: any) {
    console.error("❌ Gagal mengirim email ke Blogspot:", err.message);
    process.exit(1);
  }
}

run();
