async function postToLinkedInCompany() {
    const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    const ORG_ID = process.env.LINKEDIN_ORGANIZATION_ID;

    if (!ACCESS_TOKEN || !ORG_ID || !fs.existsSync(JSON_FILE)) return;

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    let allPosts: any[] = [];
    const postedDb = fs.existsSync(DATABASE_FILE) ? fs.readFileSync(DATABASE_FILE, 'utf8') : "";

    for (const [cat, posts] of Object.entries<any>(data)) {
        const catSlug = slugify(cat);
        posts.forEach((p: any) => {
            const fileSlug = p[1].replace('.html', '').replace(/^\//, '');
            if (fileSlug.startsWith("agregat-20")) return;
            const fullUrl = `${BASE_URL}/${catSlug}/${fileSlug}`;

            if (!postedDb.includes(fullUrl)) {
                allPosts.push({ title: p[0], url: fullUrl, date: p[3], desc: p[4] || "Archive." });
            }
        });
    }

    allPosts.sort((a, b) => b.date.localeCompare(a.date));
    if (allPosts.length === 0) return console.log("🏁 Company: Clear.");

    const target = allPosts[0];
    const commonHeaders = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202510',
        'Content-Type': 'application/json'
    };

    try {
        console.log(`🏢 Post ke Company Page (Mode Link): ${target.title}`);

        // KITA LANGSUNG KE STEP POSTING (TANPA UPLOAD IMAGE)
        await httpPost(
            'https://api.linkedin.com/rest/posts',
            {
                author: ORG_ID,
                commentary: `${target.title}\n\n${target.url}\n\n${target.desc}`,
                visibility: 'PUBLIC',
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                lifecycleState: 'PUBLISHED'
                // Bagian 'content' dihapus agar LinkedIn melakukan auto-crawl link
            },
            commonHeaders
        );

        if (!fs.existsSync('mini')) fs.mkdirSync('mini', { recursive: true });
        fs.appendFileSync(DATABASE_FILE, target.url + '\n');
        console.log(`✅ Berhasil posting link ke Company Page!`);

    } catch (err: any) {
        console.error('❌ LinkedIn Page Error:', err.message);
        // Jika masih error 403/400, berarti token benar-benar tidak punya akses ke ORG_ID
        process.exit(1);
    }
}
