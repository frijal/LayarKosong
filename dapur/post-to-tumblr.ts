async function postToTumblr(target: any) {
    // Gunakan endpoint v2/blog/{blog-identifier}/posts
    const url = `https://api.tumblr.com/v2/blog/${BLOG_NAME}.tumblr.com/posts`;

    // Tag harus dikirim dalam array string untuk format NPE
    const tags = ["fediverse", "Repost", "Ngopi", "Indonesia", target.category]
    .map(t => t.replace(/&/g, "dan").replace(/[^\w\s]/g, "").trim());

    console.log(`🚀 Mengirim ke Tumblr (NPE Mode): ${target.title}`);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                // Tumblr API v2 NPE mendukung Authorization Bearer
                // Pastikan TOKEN ini adalah OAuth2 Token (jika ada)
                // ATAU gunakan api_key di URL jika OAuth1 gagal
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                // Format NPE (New Post Editing)
                content: [
                    { type: "text", text: target.desc },
                    { type: "text", text: "#fediverse #Indonesia" },
                    { type: "link", url: target.url }
                ],
                tags: tags
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            // Tumblr suka kasih error detail di sini
            console.error("❌ Detail Error Tumblr:", data);
            throw new Error(`HTTP ${res.status}: ${data.meta?.msg || "Unknown Error"}`);
        }

        console.log("✅ Berhasil post ke Tumblr!");
        return data;
    } catch (err: any) {
        console.error("❌ Gagal total:", err.message);
        process.exit(1);
    }
}
