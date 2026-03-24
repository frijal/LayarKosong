/**
 * =================================================================================
 * PageCounter v6.0 (Views ~ Total) - Ultra Fast & Inherit Style
 * =================================================================================
 */

interface PageStats {
    v: number; // views per page
    t: number; // total domain views
}

const browserIcons: Record<string, string> = {
    Firefox: '/ext/icons/firefox.svg', Chrome: '/ext/icons/chrome.svg',
    Edge: '/ext/icons/edge.svg', Safari: '/ext/icons/safari.svg', Unknown: '/ext/icons/unknown.svg'
};

const osIcons: Record<string, string> = {
    Windows: '/ext/icons/windows.svg', macOS: '/ext/icons/macios.svg', Linux: '/ext/icons/linux.svg',
    Android: '/ext/icons/android.svg', iOS: '/ext/icons/macios.svg', Unknown: '/ext/icons/unknown.svg'
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

// --- B. FETCH STATS (Views ~ Total) ---
async function getStats(): Promise<PageStats | null> {
    try {
        const res = await fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`);
        return res.ok ? await res.json() : null;
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

        for (const category in data) {
            const match = data[category].find((entry: any) => entry[1] === fileName);
            if (match) return new Date(match[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    } catch { }
    return null;
}

// --- D. RENDER ---
const [stats, articleDate] = await Promise.all([getStats(), getArticleDate()]);
const iconHTML = (path: string, alt: string) => `<img src="${path}" alt="${alt}" class="pc-icon">`;

target.innerHTML = `
<div id="pagecounter-wrapper">
<div class="pc-group">
<div class="pc-block">${iconHTML(browserIcons[browser] || browserIcons.Unknown, browser)} <span>${browser}</span></div>
<div class="pc-block">${iconHTML(osIcons[os] || osIcons.Unknown, os)} <span>${os}</span></div>
</div>
<div class="pc-group">
${articleDate ? `<div class="pc-block">🗓️ ${articleDate}</div>` : ''}
${stats ? `
    <div class="pc-block">
    <span class="pc-label">\u221E</span>
    <span class="pc-value">${stats.v.toLocaleString('id-ID')} ~ ${stats.t.toLocaleString('id-ID')}</span>
    </div>` : ''}
    </div>
    </div>`;
});

// --- E. CSS (Inherit & Minimalist) ---
const pcStyle = document.createElement('style');
pcStyle.textContent = `
#pagecounter-wrapper { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 15px 0; font-size: 0.75rem; }
.pc-group { display: flex; gap: 10px; align-items: center; }
.pc-block { display: flex; align-items: center; gap: 6px; }
.pc-icon { width: 16px; height: 16px; display: block; object-fit: contain; }
.pc-label { font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; }
.pc-value { font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; }
@media (max-width: 480px) { #pagecounter-wrapper { gap: 8px; font-size: 0.7rem; } }
`;
document.head.appendChild(pcStyle);