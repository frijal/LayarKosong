import axios from 'axios';

async function refreshLinkedInToken() {
    const CURRENT_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
    const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
    const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

    if (!CURRENT_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
        console.error("Missing LinkedIn Secrets!");
        process.exit(1);
    }

    try {
        console.log("🔄 Menyegarkan LinkedIn Access Token...");
        
        // LinkedIn menggunakan form-urlencoded untuk refresh
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', CURRENT_TOKEN); // LinkedIn menyebutnya refresh_token
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);

        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.data.access_token) {
            console.log(response.data.access_token);
        }
    } catch (err) {
        console.error("❌ Gagal Refresh LinkedIn:", err.response?.data || err.message);
        process.exit(1);
    }
}

refreshLinkedInToken();
