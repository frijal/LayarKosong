/**
 * =================================================================================
 * View Counter & Article Date v5.2 (Clean Inherit Style)
 * Optimized for Layar Kosong V6.9 - Zero Decoration, Auto Theme
 * =================================================================================
 */

interface ViewResponse {
    views: number;
}

const browserIcons: Record<string, string> = {
    Firefox: '/ext/icons/firefox.svg',
    Chrome: '/ext/icons/chrome.svg',
    Edge: '/ext/icons/edge.svg',
    Safari: '/ext/icons/safari.svg',
    Unknown: '/ext/icons/unknown.svg'
};

const osIcons: Record<string, string> = {
    Windows: '/ext/icons/windows.svg',
    macOS: '/ext/icons/macios.svg',
    Linux: '/ext/icons/linux.svg',
    Android: '/ext/icons/android.svg',
    iOS: '/ext/icons/macios.svg',
    Unknown: '/ext/icons/unknown.svg'
};

document.addEventListener('DOMContentLoaded', async () => {
    const target = document.getElementById('iposbrowser') as HTMLElement | null;
    if (!target) return;

    // --- A. DETEKSI USER AGENT ---
    const ua = navigator.userAgent;
    const browser = /(firefox|fxios)/i.test(ua) ? 'Firefox' :
    /edg/i.test(ua) ? 'Edge' :
    /chrome|crios/i.test(ua) ? 'Chrome' :
    /safari/i.test(ua) ? 'Safari' : 'Unknown';

const os = /android/i.test(ua) ? 'Android' :
/iphone|ipad|ipod/i.test(ua) ? 'iOS' :
ua.includes('Windows') ? 'Windows' :
ua.includes('Mac') ? 'macOS' :
ua.includes('Linux') ? 'Linux' : 'Unknown';

// --- B. FETCH VIEW COUNTER (CLOUDFLARE FUNCTIONS) ---
async function fetchViews(): Promise<number | null> {
    try {
        const slug = window.location.pathname;
        const res = await fetch(`/hit?url=${encodeURIComponent(slug)}`);
        if (!res.ok) return null;
        const data: ViewResponse = await res.json();
        return data.views;
    } catch { return null; }
}

// --- C. AMBIL TANGGAL VIA DATA PROVIDER ---
async function getArticleDate(): Promise<string | null> {
    try {
        while (!(window as any).siteDataProvider) {
            await new Promise(r => setTimeout(r, 100));
        }
        const currentPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
        const fileName = currentPath.endsWith('.html') ? currentPath : `${currentPath}.html`;
        const data = await (window as any).siteDataProvider.getData();

        let foundDate: string | null = null;
        for (const category in data) {
            const match = data[category].find((entry: any) => entry[1] === fileName);
            if (match) {
                foundDate = match[3];
                break;
            }
        }
        if (foundDate) {
            return new Date(foundDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    } catch (e) { console.warn("Gagal ambil tanggal:", e); }
    return null;
}

// --- D. RENDER PARALEL ---
const [viewCount, articleDate] = await Promise.all([fetchViews(), getArticleDate()]);

const getIconHTML = (path: string, alt: string) => `<img src="${path}" alt="${alt}" class="pc-icon">`;

const viewsHTML = viewCount ? `
<div class="pc-block">
<span class="pc-label">VIEWS</span>
<span class="pc-value">${viewCount.toLocaleString('id-ID')}</span>
</div>` : '';

const dateHTML = articleDate ? `
<div class="pc-block">
<span>🗓️ ${articleDate}</span>
</div>` : '';

target.innerHTML = `
<div id="pagecounter-wrapper">
<div class="pc-group">
<div class="pc-block">
${getIconHTML(browserIcons[browser] || browserIcons.Unknown, browser)}
<span>${browser}</span>
</div>
<div class="pc-block">
${getIconHTML(osIcons[os] || osIcons.Unknown, os)}
<span>${os}</span>
</div>
</div>
<div class="pc-group">
${dateHTML}
${viewsHTML}
</div>
</div>`;
});

// --- E. INJEKSI CSS (Minimalis & Inherit) ---
const pcStyle = document.createElement('style');
pcStyle.textContent = `
#pagecounter-wrapper {
display: flex;
align-items: center;
justify-content: center;
gap: 12px;
flex-wrap: wrap;
margin: 15px 0;
font-size: 0.75rem;
}
.pc-group {
    display: flex;
    gap: 10px;
    align-items: center;
}
.pc-block {
    display: flex;
    align-items: center;
    gap: 6px;
}
.pc-icon {
    width: 16px;
    height: 16px;
    display: block;
    object-fit: contain;
}
.pc-label {
    font-weight: 700;
    font-size: 0.65rem;
    opacity: 0.7;
}
.pc-value {
    font-weight: 600;
}
@media (max-width: 480px) {
    #pagecounter-wrapper { gap: 8px; font-size: 0.7rem; }
}
`;
document.head.appendChild(pcStyle);