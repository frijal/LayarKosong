import nodemailer from "nodemailer";

/**
 * CONFIGURATION
 */
const CONFIG = {
  articleFile: "artikel.json",
  databaseFile: "mini/posted-blogspot.txt",
  baseUrl: "https://dalam.web.id",

  // Ambil dari Bun.env
  smtpHost: Bun.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(Bun.env.SMTP_PORT || "465"),
  smtpUser: Bun.env.SMTP_USER!,
  smtpPassword: Bun.env.SMTP_PASSWORD!, // WAJIB PAKAI APP PASSWORD GMAIL!
  blogPostEmail: Bun.env.BLOGSPOT_POST_EMAIL!, 
};

/* =====================
 * Interfaces
 * ===================== */
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
  // Validasi Env yang lebih ketat
if (!CONFIG.smtpUser || !CONFIG.smtpPassword || !CONFIG.blogPostEmail) {
  console.error("❌ Error: SMTP_USER, SMTP_PASSWORD, atau BLOGSPOT_POST_EMAIL belum diset.");
  process.exit(1);
}

// Cek apakah string mengandung karakter '@' khas email atau cuma teks palsu
if (!CONFIG.blogPostEmail.includes('@') || CONFIG.blogPostEmail.trim() === '') {
  console.error("❌ Error: BLOGSPOT_POST_EMAIL ada isinya, tapi formatnya BUKAN email yang valid!");
  console.error(`👉 Panjang karakter yang terbaca: ${CONFIG.blogPostEmail.length} karakter.`);
  console.error(`👉 Cek file YAML kamu, pastikan nilainya bukan teks mentah atau 'undefined'.`);
  process.exit(1);
}

  const articleFile = Bun.file(CONFIG.articleFile);
  if (!(await articleFile.exists())) {
    console.error(`❌ Error: ${CONFIG.articleFile} tidak ditemukan.`);
    process.exit(1);
  }

  // Load Database pakai Bun.file
  const dbFile = Bun.file(CONFIG.databaseFile);
  const postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

  const rawData = (await articleFile.json()) as ArticleData;
  let allArticles: Article[] = [];

  for (const [category, items] of Object.entries(rawData)) {
    const catSlug = slugify(category);
    for (const item of items) {
      const [title, fileName, imageUrl, isoDate, description] = item;
      const fileSlug = fileName.replace('.html', '').replace(/^\//, '');

      if (fileSlug.startsWith("agregat-20")) continue;

      const fullUrl = `${CONFIG.baseUrl}/${catSlug}/${fileSlug}`;

      // Konsisten: Cek berdasarkan fileSlug
      if (!postedDatabase.includes(`[${fileSlug}]`)) {
        allArticles.push({
          title,
          url: fullUrl,
          slug: fileSlug,
          image: imageUrl,
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
   * Format Body Email (Sudah diperbaiki struktur div-nya)
   * ===================== */
  const emailContent = `
  <div dir="ltr">
    <div>
      ${target.desc}
      ${target.image ? `<br><a href="${target.url}"><img src="${target.image}" width="auto" height="auto"></a>` : ""}<br><br>
    </div>
    <br clear="all">
    <div>
      Baca artikel selengkapnya di: <a href="${target.url}">${target.url}</a>
    </div>
  </div>
  `;

  /* =====================
   * Setup Nodemailer & Kirim
   * ===================== */
  const transporter = nodemailer.createTransport({
    host: CONFIG.smtpHost,
    port: CONFIG.smtpPort,
    secure: CONFIG.smtpPort === 465, // true untuk 465, false untuk port lainnya
    auth: {
      user: CONFIG.smtpUser,
      pass: CONFIG.smtpPassword, // Masukkan 16 digit App Password di sini
    },
    // Tambahan timeout biar gak gantung kalau koneksi diblokir firewall
    connectionTimeout: 10000, 
  });

  try {
    await transporter.sendMail({
      from: `"Layar Kosong Syndication" <${CONFIG.smtpUser}>`,
      to: CONFIG.blogPostEmail,
      subject: target.title, 
      html: emailContent,    
    });

    // Simpan Log dengan format unik agar .includes() tidak salah deteksi di kemudian hari
    const newContent = postedDatabase + `[${target.slug}]\n`;
    await Bun.write(CONFIG.databaseFile, newContent);

    console.log(`✅ Berhasil! Artikel "${target.title}" terposting ke Blogspot.`);

  } catch (err: any) {
    console.error("❌ Gagal mengirim email ke Blogspot:", err.message);
    if (err.message.includes("Invalid login")) {
      console.error("💡 Petunjuk: Google menolak password-mu. Pastikan kamu menggunakan 'App Password', bkn password akun utama.");
    }
    process.exit(1);
  }
}

run();
