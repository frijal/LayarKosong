/**
 * PATCHED VERSION: post-to-facebook-patch.ts
 * Security improvements:
 * - Strict env var validation
 * - Timeout enforcement on network requests
 * - Better error handling with detailed logging
 * - Input sanitization for metadata
 */

const CONFIG = {
    articleFile: "artikel.json",
    databaseFile: "mini/posted-facebook.txt",
    domainUrl: "https://dalam.web.id",
    pageId: Bun.env.FB_PAGE_ID,
    accessToken: Bun.env.FB_PAGE_TOKEN,
    requestTimeout: 15000, // 15 seconds
    maxRetries: 3,
};

/* =====================
 * Security Helpers
 * ===================== */

// Validate required environment variables
function validateEnvironment(): void {
    const required = ['FB_PAGE_ID', 'FB_PAGE_TOKEN'];
    const missing = required.filter(key => !Bun.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    }
    
    if (!CONFIG.pageId || CONFIG.pageId.length === 0) {
        throw new Error("❌ FB_PAGE_ID is empty");
    }
    
    if (!CONFIG.accessToken || CONFIG.accessToken.length === 0) {
        throw new Error("❌ FB_PAGE_TOKEN is empty");
    }
    
    // Validate token format (basic check)
    if (CONFIG.accessToken.length < 50) {
        console.warn("⚠️  Warning: FB_PAGE_TOKEN seems too short, might be invalid");
    }
}

// Enforce timeout on fetch operations
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = CONFIG.requestTimeout
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

// Sanitize hashtag input
function sanitizeHashtag(text: string): string {
    return text
        .trim()
        .replace(/[^a-zA-Z0-9_\s]/g, '')
        .replace(/\s+/g, '')
        .substring(0, 100);
}

// Validate URL format
function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/* =====================
 * Interfaces
 * ===================== */

type RawArticle = [string, string, any, string, string?];

interface ArticleData {
    [category: string]: RawArticle[];
}

interface Article {
    title: string;
    url: string;
    slug: string;
    date: string;
    desc: string;
    category: string;
}

/* =====================
 * Utils
 * ===================== */

const slugify = (text: string): string =>
    text.toLowerCase().trim().replace(/\s+/g, '-');

const escapeMessage = (text: string): string =>
    text.replace(/[<>]/g, ''); // Remove potentially problematic chars

/* =====================
 * Main Logic
 * ===================== */

async function main() {
    try {
        // 1. Validasi Environment Awal
        validateEnvironment();
        console.log("✅ Environment variables validated");

        // 2. Load Files
        const articleFile = Bun.file(CONFIG.articleFile);
        const dbFile = Bun.file(CONFIG.databaseFile);

        if (!(await articleFile.exists())) {
            throw new Error("❌ Error: artikel.json tidak ditemukan");
        }

        const data = (await articleFile.json()) as ArticleData;
        const postedDatabase = (await dbFile.exists()) ? await dbFile.text() : "";

        // 3. Parsing & Filtering
        const allPosts: Article[] = [];
        for (const [categoryName, posts] of Object.entries(data)) {
            if (!Array.isArray(posts)) continue;
            
            const catSlug = slugify(categoryName);
            for (const post of posts) {
                const fileName = String(post[1] || "").trim();
                const fileSlug = fileName.replace(/\.html$/i, "").replace(/\//g, "");

                if (fileSlug.startsWith("agregat-20")) continue;

                const fullUrl = `${CONFIG.domainUrl}/${catSlug}/${fileSlug}`;

                // Validate URL before adding
                if (!isValidUrl(fullUrl)) {
                    console.warn(`⚠️  Skipping invalid URL: ${fullUrl}`);
                    continue;
                }

                // Cek apakah URL sudah pernah diposting
                if (!postedDatabase.includes(fullUrl) && !postedDatabase.includes(fileSlug)) {
                    allPosts.push({
                        title: String(post[0] || "Untitled").substring(0, 500),
                        slug: fileSlug,
                        url: fullUrl,
                        date: String(post[3] || ""),
                        desc: String(post[4] || "Archive.").substring(0, 500),
                        category: categoryName,
                    });
                }
            }
        }

        // Sorting Terbaru (ISO Date comparison)
        allPosts.sort((a, b) => {
            try {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            } catch {
                return 0;
            }
        });

        if (allPosts.length === 0) {
            console.log("✅ Facebook: Tidak ada artikel baru untuk diposting.");
            return;
        }

        const target = allPosts[0];
        const catHashtag = "#" + sanitizeHashtag(target.category);
        const message = `${escapeMessage(target.desc)}\n\n${catHashtag}\n\n${target.url}`;

        // 4. Eksekusi Post dengan Retry Logic
        console.log(`🚀 Mengirim ke Facebook Page: ${target.title}`);

        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
            try {
                const fbUrl = `https://graph.facebook.com/v25.0/${CONFIG.pageId}/feed`;

                // Validasi URL sebelum request
                if (!isValidUrl(fbUrl)) {
                    throw new Error("Invalid Facebook Graph API URL");
                }

                const params = new URLSearchParams();
                params.append("message", message);
                params.append("link", target.url);
                params.append("access_token", CONFIG.accessToken);

                console.log(`⏳ Attempt ${attempt}/${CONFIG.maxRetries}...`);

                const response = await fetchWithTimeout(fbUrl, {
                    method: "POST",
                    body: params,
                });

                const result = (await response.json()) as any;

                if (!response.ok) {
                    const errorMsg = result.error?.message || "Unknown Facebook error";
                    throw new Error(`Facebook API Error (${response.status}): ${errorMsg}`);
                }

                // 5. Update Database (Hanya jika fetch berhasil)
                const newContent = 
                    postedDatabase + (postedDatabase.endsWith('\n') ? '' : '\n') + target.url + "\n";
                await Bun.write(CONFIG.databaseFile, newContent);

                console.log(`✅ Berhasil! Artikel terposting. FB Post ID: ${result.id}`);
                return; // Success! Exit the retry loop

            } catch (err: any) {
                lastError = err;
                const errorMsg = err.message || String(err);
                console.warn(`⚠️  Attempt ${attempt} failed: ${errorMsg}`);
                
                if (attempt < CONFIG.maxRetries) {
                    const delayMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
                    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        // All retries exhausted
        throw new Error(`❌ Failed after ${CONFIG.maxRetries} attempts: ${lastError?.message}`);

    } catch (err: any) {
        console.error("❌ Fatal Error:", err.message);
        process.exit(1);
    }
}

main();
