import nodemailer from "nodemailer";

/**
 * CONFIGURATION
 */
const CONFIG = {
    articleFile: "artikel.json",
    databaseFile: "mini/posted-wordpress.txt", // Database khusus satelit WordPress
    baseUrl: "https://dalam.web.id", 

    // Ambil dari Bun.env
    smtpHost: Bun.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(Bun.env.SMTP_PORT || "465"),
    smtpUser: Bun.env.SMTP_USER!,
    smtpPassword: Bun.env.SMTP_PASSWORD!,
    wpPostEmail: Bun.env.WP_POST_EMAIL!, // Email rahasia xyz123@post.wordpress.com
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

const cleanTag = (str: string): string =>
    str.replace(/&/g, "dan").replace(/[^\w\s]/g, "").trim();

/* =====================
 * Main Logic
 * ===================== */
async function run(): Promise<void> {
    // Validasi Env
    if (!CONFIG.smtpUser || !CONFIG.smtpPassword || !CONFIG.wpPostEmail) {
        console.error("❌ Error: SMTP_USER, SMTP_PASSWORD, atau WP_POST_EMAIL belum diset.");
        process.exit(1);
    }

    const articleFile = Bun.file(CONFIG.articleFile);
    if (!(await articleFile.exists())) {
        console.error(`❌ Error: ${CONFIG.articleFile} tidak ditemukan.`);
        process.exit(1);
    }

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

            if (!postedDatabase.includes(fileSlug)) {
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
        console.log("🏁 WP Planet: Semua artikel sudah terposting.");
        return;
    }

    console.log(`🚀 Mengirim Email Post ke WordPress Planet: ${target.title}`);

    /* =====================
     * Otomatisasi Tag
     * ===================== */
    const tags = new Set<string>();
    tags.add("fediverse"); 
    tags.add("repost");
    tags.add(cleanTag(target.category));

    target.title
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 3)
        .forEach(w => tags.add(cleanTag(w).toLowerCase()));

    // Format shortcode tag bawaan WordPress.com Post by Email
    const wpTagsShortcode = `[tags ${[...tags].join(", ")}]`;

    /* =====================
     * Format Body Email (WordPress Markdown Extra)
     * ===================== */
    // Menyesuaikan dokumentasi WP: Linked Images menggunakan format [![alt text](/img.png)] (https://url.com "Title")
    const imageMarkdown = target.image 
        ? `[![${target.title}](${target.image})] (${target.url} "${target.title}")\n\n` 
        : "";

    // Inline Links disesuaikan: A [link](https://example.com "Title")
    // Catatan Line breaks WP: WP auto-linebreaking memproses regular line break (\n) menjadi <br>.
    // Untuk memisahkan paragraf, double line break (\n\n) tetap digunakan.
    const emailContent = `${target.desc}\n\n${imageMarkdown}Baca artikel selengkapnya di: [${target.url}](${target.url} "${target.title}")\n\n${wpTagsShortcode}`;

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
            to: CONFIG.wpPostEmail,
            subject: target.title, 
            text: emailContent, 
        });

        // Simpan Log pakai target.slug
        const newContent = postedDatabase + target.slug + "\n";
        await Bun.write(CONFIG.databaseFile, newContent);

        console.log(`✅ Berhasil! Artikel terposting ke WordPress (Format WP Markdown Extra).`);

    } catch (err: any) {
        console.error("❌ Gagal mengirim email ke WordPress:", err.message);
        process.exit(1);
    }
}

run();