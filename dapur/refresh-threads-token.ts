/**
 * Script untuk refresh Threads Access Token (Long-lived Token)
 * 📍 Lokasi: Balikpapan | Runtime: Bun 🚀
 */

async function refreshThreadsToken(): Promise<void> {
    const token = Bun.env.THREADS_ACCESS_TOKEN;

    // Keluar tanpa berisik jika token tidak ada (standar GitHub Action)
    if (!token) process.exit(1);

    try {
        // Menggunakan URL untuk konstruksi params yang lebih bersih
        const url = new URL('https://graph.threads.net/refresh_access_token');
        url.searchParams.append('grant_type', 'th_refresh_token');
        url.searchParams.append('access_token', token);

        // Pakai fetch native Bun
        const response = await fetch(url.toString());

        const data = await response.json() as { access_token?: string; error?: any };

        if (response.ok && data.access_token) {
            // Cetak HANYA token untuk ditangkap oleh mask/secret di CI/CD
            console.log(data.access_token);
        } else {
            // Jika gagal, keluar dengan error code 1
            process.exit(1);
        }
    } catch (e) {
        // Silent fail sesuai logic asli kamu
        process.exit(1);
    }
}

refreshThreadsToken();
