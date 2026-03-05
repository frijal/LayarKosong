/**
 * =================================================================================
 * IP, OS, Browser Info & Article Date v4.4 (Merged Edition)
 * =================================================================================
 */

// 1. Definisi Tipe Data
interface GeoData {
    city: string;
    country: string;
    country_name: string;
    country_code: string;
    error?: boolean;
}

interface GeoResult {
    city: string;
    country: string;
    code: string;
}

// Map untuk path icon
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

    // --- BAGIAN A: DETEKSI USER AGENT ---
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

// --- BAGIAN B: AMBIL TANGGAL ARTIKEL (METADATA) ---
const getArticleDate = (): string | null => {
    let rawDate: string | null = null;

    // Cek Meta Tag
    const metaTag = document.querySelector('meta[property="article:published_time"]');
    if (metaTag) rawDate = metaTag.getAttribute('content');

    // Cek JSON-LD jika Meta Tag tidak ada
    if (!rawDate) {
        const jsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
        jsonScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent || '');
                rawDate = data.datePublished || data.dateModified || rawDate;
            } catch (e) {}
        });
    }

    if (rawDate) {
        const dateObj = new Date(rawDate);
        return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return null;
};

// --- BAGIAN C: FETCH GEOIP ---
async function fetchGeo(): Promise<GeoResult | null> {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const d: GeoData = await res.json();
        return d.error ? null : { city: d.city, country: d.country_name, code: d.country_code };
    } catch {
        return null;
    }
}

// Eksekusi Fetch & Date Finder secara paralel
const [geo, articleDate] = await Promise.all([fetchGeo(), Promise.resolve(getArticleDate())]);

// --- BAGIAN D: RENDER HTML ---
const getIconHTML = (path: string, alt: string) => `<img src="${path}" alt="${alt}" style="width:18px; height:18px; display:block; transition:transform 0.3s ease;">`;

const geoHTML = geo ? `
<div class="info-block" style="display:flex; align-items:center; gap:6px;">
<img src="https://flagcdn.com/24x18/${geo.code.toLowerCase()}.png" alt="${geo.code}" style="width:18px; height:auto; border-radius:2px;">
<span>${geo.city || geo.country}</span>
</div>` : '';

const dateHTML = articleDate ? `
<div class="info-block" style="display:flex; align-items:center; gap:6px; border-left: 1px solid rgba(128,128,128,0.3); padding-left: 10px;">
<span style="opacity: 0.8;"><i class="fa-solid fa-code"></i> ${articleDate}</span>
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

// --- BAGIAN E: INJEKSI CSS ---
const style = document.createElement('style');
style.textContent = `
:root { --ipos-text: #444; --ipos-shadow: rgba(255, 255, 255, 0.5); }
@media (prefers-color-scheme: dark) { :root { --ipos-text: #ccc; --ipos-shadow: rgba(0, 0, 0, 0.5); } }
body.dark-mode :root, body.dark :root { --ipos-text: #e6e6e6; --ipos-shadow: rgba(0, 0, 0, 0.5); }
#ipos-browser-info { color: var(--ipos-text); transition: all 0.3s ease; }
#ipos-browser-info .info-block:hover { opacity: 0.7; }
@media (max-width: 480px) { #ipos-browser-info { font-size: 0.7rem; gap: 8px; } }
`;
document.head.appendChild(style);
