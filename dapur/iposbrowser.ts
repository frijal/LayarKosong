/**
 * =================================================================================
 * PageCounter v6.3 (Views ~ Total) - Pure HTML & Inherit Global Style
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
    const ua = pemandu.userAgent;
    const browser = /(firefox|fxios)/i.test(ua) ? 'Firefox' :
    /edg/i.test(ua) ? 'Edge' :
    /chrome|crios/i.test(ua) ? 'Chrome' :
    /safari/i.test(ua) ? 'Safari' : 'Unknown';

const os = /android/i.test(ua) ? 'Android' :
/iphone|ipad|ipod/i.test(ua) ? 'iOS' :
ua.includes('Windows') ? 'Windows' :
ua.includes('Mac') ? 'macOS' :
ua.includes('Linux') ? 'Linux' : 'Unknown';

// --- B. FETCH STATS ---
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
            if (match) return new Date(match[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    } catch { }
    return null;
}

// --- D. RENDER ---
const [stats, articleDate] = await Promise.all([getStats(), getArticleDate()]);

const iconHTML = (path: string, alt: string) =>
    `<img src="${path}" alt="${alt}" style="width:14px; height:14px; vertical-align:middle; margin-right:4px; display:inline-block;">`;

const feedHTML = `
<span style="display:inline-flex; align-items:center; gap:8px; white-space:nowrap;">
    <a
        aria-label="Atom Feed"
        rel="noopener noreferrer"
        title="Atom Feed"
        href="https://dalam.web.id/atom.xml"
        target="_blank"
        style="width:1em;height:1em;font-size:inherit;color:#2563eb;vertical-align:-.125em;justify-content:center;align-items:center;line-height:1;text-decoration:none;display:inline-flex;"
    >
        <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" role="img" style="width:1em;height:1em;display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" fill="currentColor" r="5"></circle>
            <ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"></ellipse>
            <ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"></ellipse>
            <ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"></ellipse>
        </svg>
    </a>

    <a
        aria-label="RSS Feed"
        rel="noopener noreferrer"
        title="RSS Feed"
        href="https://dalam.web.id/rss.xml"
        target="_blank"
        style="width:1em;height:1em;font-size:inherit;color:#f97316;vertical-align:-.125em;justify-content:center;align-items:center;line-height:1;text-decoration:none;display:inline-flex;"
    >
        <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" role="img" style="width:1em;height:1em;display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
            <rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"></rect>
            <circle cx="22" cy="44" fill="white" r="5"></circle>
            <path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"></path>
            <path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"></path>
        </svg>
    </a>
</span>`;

// Inline style minimalis agar flexbox bekerja tanpa mengganggu CSS luar
target.innerHTML = `
<div id="pagecounter-wrapper" style="display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:12px; margin:10px 0 20px; font-size:0.85em; color:var(--text-muted); line-height:1.5;">
    <span style="white-space:nowrap;">${iconHTML(browserIcons[browser] || browserIcons.Unknown, browser)}${browser}</span>
    <span style="white-space:nowrap;">${iconHTML(osIcons[os] || osIcons.Unknown, os)}${os}</span>
    ${articleDate ? `<span style="white-space:nowrap;">🗓️ ${articleDate}</span>` : ''}
    ${stats ? `
        <span style="white-space:nowrap;">
            <strong>\u221E</strong>
            ${stats.v.toLocaleString('id-ID')} <small>~</small> ${stats.t.toLocaleString('id-ID')}
        </span>` : ''}
    ${feedHTML}
</div>`;
});
