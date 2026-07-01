/**
 * =================================================================================
 * PageCounter v6.4 (Lite Edition) - Optimized for Frijal
 * =================================================================================
 */

interface PageStats {
    v: number;
    t: number;
}

document.addEventListener('DOMContentLoaded', async () => {
    const target = document.getElementById('iposbrowser') as HTMLElement | null;
    if (!target) return;

    // --- A. DETEKSI USER AGENT (Lebih ringan tanpa Regex berulang) ---
    const ua = navigator.userAgent.toLowerCase();
    const os = ua.includes('android') ? 'Android' :
    /iphone|ipad|ipod/.test(ua) ? 'iOS' :
    ua.includes('windows') ? 'Windows' :
    ua.includes('mac') ? 'macOS' :
    ua.includes('linux') ? 'Linux' : 'Unknown';

const browser = (ua.includes('firefox') || ua.includes('fxios')) ? 'Firefox' :
ua.includes('edg') ? 'Edge' :
(ua.includes('chrome') || ua.includes('crios')) ? 'Chrome' :
ua.includes('safari') ? 'Safari' : 'Unknown';

// Helper ikon dinamis (nggak perlu deklarasi dictionary/object panjang)
const getIcon = (name: string) => {
    const file = (name === 'iOS' || name === 'macOS') ? 'macios' : name.toLowerCase();
    // Fallback otomatis ke unknown.svg pakai onerror bawaan native HTML
    return `<img src="/ext/icons/${file}.svg" alt="${name}" onerror="this.src='/ext/icons/unknown.svg'" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;display:inline-block;">`;
};

// --- B. FETCH STATS (Langsung inisiasi promise) ---
const fetchStats = fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`)
.then(res => res.ok ? res.json() as Promise<PageStats> : null)
.catch(() => null);

// --- C. AMBIL TANGGAL (Polling dengan Batas Waktu biar CPU nggak ngos-ngosan) ---
const fetchDate = new Promise<string | null>((resolve) => {
    let attempts = 0;
    const timer = setInterval(async () => {
        const dp = (window as any).siteDataProvider;
        if (dp) {
            clearInterval(timer);
            try {
                const currentPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
                const fileName = currentPath.endsWith('.html') ? currentPath : `${currentPath}.html`;
                const data = await dp.getData();

                for (const cat in data) {
                    const match = data[cat].find((e: any) => e[1] === fileName);
                    if (match) return resolve(new Date(match[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
                }
            } catch {}
            resolve(null);
        } else if (++attempts > 30) {
            // Maksimal 3 detik (30 x 100ms), kalau nggak ada ya wes ditinggal wae
            clearInterval(timer);
            resolve(null);
        }
    }, 100);
});

// --- D. EKSEKUSI PARALEL & RENDER ---
const [stats, articleDate] = await Promise.all([fetchStats, fetchDate]);

// SVG di-minify (buang xmlns, role, aria-hidden yang redundant karena parent <a> sudah pakai aria-label)
const atomSVG = `<svg viewBox="0 0 64 64" fill="none" style="width:1em;height:1em;display:block;overflow:visible;"><circle cx="32" cy="32" fill="currentColor" r="5"/><ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/></svg>`;
const rssSVG = `<svg viewBox="0 0 64 64" fill="none" style="width:1em;height:1em;display:block;overflow:visible;"><rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/><circle cx="22" cy="44" fill="white" r="5"/><path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/><path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/></svg>`;

target.innerHTML = `
<div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;margin:10px 0 20px;font-size:0.85em;color:var(--text-muted);line-height:1.5;">
<span style="white-space:nowrap;">${getIcon(browser)}${browser}</span>
<span style="white-space:nowrap;">${getIcon(os)}${os}</span>
${articleDate ? `<span style="white-space:nowrap;">🗓️ ${articleDate}</span>` : ''}
${stats ? `<span style="white-space:nowrap;"><strong>\u221E</strong> ${stats.v.toLocaleString('id-ID')} <small>~</small> ${stats.t.toLocaleString('id-ID')}</span>` : ''}
<span style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;">
<a aria-label="Atom Feed" rel="noopener noreferrer" title="Atom Feed" href="https://dalam.web.id/atom.xml" target="_blank" style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;">
${atomSVG}
</a>
<a aria-label="RSS Feed" rel="noopener noreferrer" title="RSS Feed" href="https://dalam.web.id/rss.xml" target="_blank" style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;">
${rssSVG}
</a>
</span>
</div>`;
});
