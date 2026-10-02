// --- BUN NATIVE API - JSON TUPLE TO GITHUB WIKI ---
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// --- KONFIGURASI ---
const WIKI_DIR = './wiki'; // Folder repo wiki (sesuai setup GitHub Actions)
const DB_PATH = './artikel.json'; // Database utama
const TRACKER_FILE = 'wiki/mini/posted-githubwiki.txt'; 
const MAX_PER_CATEGORY = 4; // Sesuai kesepakatan: 4 artikel per kategori per run
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/frijal/layarkosong/main/';

// --- TIPE DATA ---
type ArticleTuple = [
    title: string, slug: string, image: string, publishedAt: string, description: string
];
type ArticlesDatabase = Record<string, ArticleTuple[]>;

// Helper Konversi URL Gambar
const getThumbnailUrl = (imageUrl: string): string => {
    if (!imageUrl) return `${GITHUB_BASE_URL}thumbnail.webp`;
    return imageUrl.replace(/^https?:\/\/dalam\.web\.id\//, GITHUB_BASE_URL);
};

async function run() {
    console.log("🚀 Memulai sinkronisasi bertahap JSON ke GitHub Wiki...");
    
    try {
        // 1. Siapkan folder Tracker
        await mkdir(dirname(TRACKER_FILE), { recursive: true });
        
        // 2. Baca Tracker: Siapa aja yang udah nangkring di Wiki?
        let postedSlugs = new Set<string>();
        const trackerFile = Bun.file(TRACKER_FILE);
        
        if (await trackerFile.exists()) {
            const text = await trackerFile.text();
            // Bersihkan array dari baris kosong
            postedSlugs = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
        }
        
        // 3. Baca Database artikel.json
        const dbFile = Bun.file(DB_PATH);
        if (!(await dbFile.exists())) {
            console.error(`❌ Fatal: Database ${DB_PATH} ora ketemu!`);
            process.exit(1);
        }
        const db: ArticlesDatabase = await dbFile.json();
        
        let sidebarContent = "### 📚 Kategori Layar Kosong\n\n- [🏠 Home](Home)\n";
        let totalBaruDiinject = 0;
        const slugsBaru: string[] = [];
        
        // 4. Looping Eksekusi per Kategori
        for (const [category, tuples] of Object.entries(db)) {
            const catSlug = category.toLowerCase().replace(/\s+/g, "-");
            const wikiFileName = category.replace(/\s+/g, "-");
            const wikiFilePath = join(WIKI_DIR, `${wikiFileName}.md`);
            
            const accumulatedItems: ArticleTuple[] = []; // Yg udah masuk wiki
            const unpostedItems: ArticleTuple[] = [];    // Yg masih antre
            
            // Pisahkan mana yang "Sudah" dan mana yang "Belum"
            for (const article of tuples) {
                const slug = article[1].replace(/\.html$/, "");
                if (postedSlugs.has(slug)) {
                    accumulatedItems.push(article);
                } else {
                    unpostedItems.push(article);
                }
            }
            
            // Pastikan kategori masuk ke Sidebar
            sidebarContent += `- [${category}](${wikiFileName})\n`;
            
            // Cek apakah ada antrean baru?
            if (unpostedItems.length === 0) {
                console.log(`⏩ Skip [${category}]: Udah full-sync (${accumulatedItems.length} artikel).`);
                continue;
            }
            
            // Urutkan antrean dari yang PALING LAMA (biar drip-feed-nya kronologis)
            unpostedItems.sort((a, b) => new Date(a[3]).getTime() - new Date(b[3]).getTime());
            
            // Ambil jatah batch (maks 4)
            const selectedForThisRun = unpostedItems.slice(0, MAX_PER_CATEGORY);
            
            console.log(`📦 Inject [${category}]: Nambah ${selectedForThisRun.length} artikel baru.`);
            
            // Gabungkan tumpukan lama dengan yang baru di-inject
            const allDisplayItems = [...accumulatedItems, ...selectedForThisRun];
            
            // Urutkan ulang tumpukan akhir dari TERBARU ke TERLAMA (biar visual Wiki enak dibaca)
            allDisplayItems.sort((a, b) => new Date(b[3]).getTime() - new Date(a[3]).getTime());
            
            // 5. Render Halaman Markdown Wiki
            let pageContent = `# ${category}\n\n`;
            pageContent += `Kumpulan artikel **${category}** di Layar Kosong.\n*Total saat ini: ${allDisplayItems.length} artikel*\n\n`;
            
            allDisplayItems.forEach((article, index) => {
                const title = article[0];
                const slug = article[1].replace(/\.html$/, "");
                const image = article[2];
                const dateStr = new Date(article[3]).toLocaleDateString("id-ID", { year: 'numeric', month: 'short', day: 'numeric' });
                const description = article[4];
                
                const fullUrl = `https://dalam.web.id/${catSlug}/${slug}`;
                const thumbnailUrl = getThumbnailUrl(image);
                
                pageContent += `### ${index + 1}. [${title}](${fullUrl})\n`;
                pageContent += `📅 **Tanggal:** ${dateStr}\n\n`;
                pageContent += `[![${title}](${thumbnailUrl})](${fullUrl})\n\n`;
                pageContent += `> ${description}\n\n`;
                pageContent += `---\n\n`;
            });
            
            pageContent += `*Diperbarui otomatis pada: ${new Date().toLocaleString("id-ID")}*`;
            
            // Timpa file Markdown kategori tersebut
            await Bun.write(wikiFilePath, pageContent);
            
            // 6. Catat slug baru ke memory tracker
            for (const item of selectedForThisRun) {
                const newSlug = item[1].replace(/\.html$/, "");
                postedSlugs.add(newSlug);
                slugsBaru.push(newSlug);
                totalBaruDiinject++;
            }
        }
        
        // 7. Update Sidebar Navigasi
        await Bun.write(join(WIKI_DIR, "_Sidebar.md"), sidebarContent);
        
        // 8. Tulis Ulang Tracker File (Kalau ada tambahan)
        if (totalBaruDiinject > 0) {
            // Nulis ulang semua array-nya sekalian (kayak di script Gist-mu)
            // Ini lebih aman dari risiko file corrupt gara-gara append yang gagal
            await Bun.write(TRACKER_FILE, Array.from(postedSlugs).join('\n'));
        }
        
        // 9. Logger Akhir (Aesthetic Mode)
        console.log(`\n--------------------------------------------------`);
        console.log(`✅ BERHASIL MERENDER : ${totalBaruDiinject} ARTIKEL BARU KE WIKI`);
        console.log(`--------------------------------------------------\n`);
        
        if (totalBaruDiinject > 0) {
            console.log(`🔗 Daftar slug yang diamankan ke tracker:`);
            slugsBaru.forEach((slug, index) => {
                console.log(`${index + 1}. ${slug}`);
            });
        } else {
            console.log(`🎉 Mantap pol! Seluruh database artikel sudah masuk Wiki.`);
        }
        
        console.log("✨ Done! Script Wiki selesai bertugas.");
        
    } catch (err: any) {
        console.error("❌ Fatal Error:", err.message);
        process.exit(1);
    }
}

run();
