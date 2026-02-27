import axios from 'axios';

async function refresh() {
    const token = process.env.THREADS_ACCESS_TOKEN;
    if (!token) process.exit(1);

    try {
        const res = await axios.get('https://graph.threads.net/refresh_access_token', {
            params: {
                grant_type: 'th_refresh_token',
                access_token: token
            }
        });
        // Cetak HANYA token agar bisa ditangkap oleh GitHub Action
        console.log(res.data.access_token);
    } catch (e) {
        process.exit(1);
    }
}

refresh();
