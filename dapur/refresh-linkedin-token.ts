/**
 * Script untuk refresh LinkedIn Access Token menggunakan API native Bun
 * 📍 Lokasi: Balikpapan | Runtime: Bun 🚀
 */

async function refreshLinkedInToken(): Promise<void> {
    const CURRENT_TOKEN = Bun.env.LINKEDIN_ACCESS_TOKEN;
    const CLIENT_ID = Bun.env.LINKEDIN_CLIENT_ID;
    const CLIENT_SECRET = Bun.env.LINKEDIN_CLIENT_SECRET;

    if (!CURRENT_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
        console.error("❌ Waduh, Rahasia LinkedIn (Env) belum lengkap!");
        process.exit(1);
    }

    try {
        console.log("🔄 Menyegarkan LinkedIn Access Token...");

        // Pakai URLSearchParams bawaan untuk x-www-form-urlencoded
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: CURRENT_TOKEN,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        });

        // Pakai Fetch API native Bun (lebih kencang & tanpa dependency axios)
        const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });

        const data = await response.json() as { access_token?: string; error?: string; error_description?: string };

        if (response.ok && data.access_token) {
            // Output token baru agar bisa ditangkap oleh script CI/CD atau Bash
            console.log(data.access_token);
        } else {
            throw new Error(data.error_description || data.error || "Gagal mendapatkan token baru");
        }
    } catch (err: any) {
        console.error("❌ Gagal Refresh LinkedIn:", err.message);
        process.exit(1);
    }
}

refreshLinkedInToken();
