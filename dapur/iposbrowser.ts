/**
 * =================================================================================
 * IP, OS, Browser Info & JSON Article Date v4.7 (Optimized for DataProvider)
 * =================================================================================
 */

// 1. Definisi Tipe Data untuk Type Safety
interface ArticleJson {
    [category: string]: any[][];
}

interface GeoData {
    city: string;
    country_name: string;
    country_code: string;
    error?: boolean;
}

const browserIcons: Record<string, string> = {
    Firefox: '/ext/icons/firefox.svg', Chrome: '/ext/icons/chrome.svg',
    Edge: '/ext/icons/edge.svg', Safari: '/ext/icons/safari.svg', Unknown: '/ext/icons/unknown.svg'
};

const osIcons: Record<string, string> = {
    Windows: '/ext/icons/windows.svg', macOS: '/ext/icons/macios.svg', Linux: '/ext/icons/linux.svg', Android: '/ext/icons/android.svg', iOS: '/ext/icons/macios.svg', Unknown: '/ext/icons/unknown.svg'
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

// --- B. AMBIL TANGGAL VIA DATA PROVIDER ---
async function getArticleDate(): Promise<string | null> {
    try {
        // Mekanisme Penjaga: Tunggu sampai window.siteDataProvider ada
        while (!(window as any).siteDataProvider) {
            await new Promise(r => setTimeout(r, 100));
        }

        const currentPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
        const fileName = currentPath.endsWith('.html') ? currentPath : `${currentPath}.html`;

        // Panggil provider (Data sudah di-cache oleh provider)
        const data = await (window as any).siteDataProvider.getData();

        let foundDate: string | null = null;
        for (const category in data) {


            // Gunakan indeks yang jelas, atau idealnya dari konfigurasi provider


            const match = data[category].find((entry: any) => entry[1] === fileName);
            if (match) {
                foundDate = match[3]; // Indeks 3 adalah tanggal
                break;
            }
        }

        if (foundDate) {
            return new Date(foundDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
    } catch (e) {
        console.warn("Gagal mengambil tanggal via Provider:", e);
    }
    return null;
}

// --- C. FETCH GEOIP ---
async function fetchGeo(): Promise<GeoData | null> {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const d: GeoData = await res.json();
        return d.error ? null : d;
    } catch { return null; }
}

// --- D. RENDER PARALEL ---
//
const [geo, articleDate] = await Promise.all([fetchGeo(), getArticleDate()]);

const getIconHTML = (path: string, alt: string) => `<img src="${path}" alt="${alt}" style="width:18px; height:18px; display:block;">`;

const geoHTML = geo ? `
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
<img src="https://flagcdn.com/24x18/${geo.country_code.toLowerCase()}.png" alt="${geo.country_code}" style="width:18px; height:auto; border-radius:2px;">
<span>${geo.city || geo.country_name}</span>
</div>` : '';

const dateHTML = articleDate ? `
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
<span><i class="fa-solid fa-code"></i> ${articleDate}</span>
</div>` : '';

target.innerHTML = `
<div id="ipos-browser-info" style="display:flex; align-items:center; justify-content:center; gap:12px; font-size:0.8rem; padding:5px; flex-wrap: wrap;">
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
${getIconHTML(browserIcons[browser] || browserIcons.Unknown, browser)}
<span>${browser}</span>
</div>
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
${getIconHTML(osIcons[os] || osIcons.Unknown, os)}
<span>${os}</span>
</div>
${geoHTML}
${dateHTML}
</div>`;
});

// --- E. INJEKSI CSS ---
const style = document.createElement('style');
style.textContent = `
#ipos-browser-info { color: #444; }
@media (prefers-color-scheme: dark) { #ipos-browser-info { color: #ccc; } }
@media (max-width: 480px) { #ipos-browser-info { font-size: 0.7rem; gap: 8px; } }
`;
document.head.appendChild(style);