/**
 * =================================================================================
 * IP & OS Browser Info v4.3 (TypeScript Edition)
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

// Map untuk path icon (Pastikan file ini ada di folder /ext/icons/)
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

    // 2. Deteksi Browser & OS
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

    // 3. Fetch GeoIP (Privacy Friendly)
    async function fetchGeo(): Promise<GeoResult | null> {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const d: GeoData = await res.json();
            return d.error ? null : { city: d.city, country: d.country_name, code: d.country_code };
        } catch {
            return null;
        }
    }

    const geo = await fetchGeo();

    // Helper untuk generate icon HTML
    const getIconHTML = (path: string, alt: string) => `<img src="${path}" alt="${alt}" style="width:22px; height:22px; display:block; transition:transform 0.3s ease;">`;

    const geoHTML = geo ? `
    <div class="geo-block" style="display:flex; align-items:center; gap:6px;">
        <img class="geo-flag" src="https://flagcdn.com/24x18/${geo.code.toLowerCase()}.png" alt="${geo.code}" style="width:20px; height:auto; border-radius:2px; border:1px solid rgba(0,0,0,0.1);">
        <span>${geo.city ? geo.city + ', ' : ''}${geo.country}</span>
    </div>` : '';

    // 4. Render HTML
    target.innerHTML = `
    <div id="ipos-browser-info" style="display:flex; align-items:center; justify-content:center; gap:15px; font-size:0.85rem; padding:5px;">
        <div class="browser-block" style="display:flex; align-items:center; gap:6px;">
            <span class="icon">${getIconHTML(browserIcons[browser] || browserIcons.Unknown, browser)}</span>
            <span class="text">${browser}</span>
        </div>
        <div class="os-block" style="display:flex; align-items:center; gap:6px;">
            <span class="icon">${getIconHTML(osIcons[os] || osIcons.Unknown, os)}</span>
            <span class="text">${os}</span>
        </div>
        ${geoHTML}
    </div>`;
});

// 5. Injeksi CSS (Optimasi Dark Mode)
const style = document.createElement('style');
style.textContent = `
:root {
    --ipos-text: #222;
    --ipos-shadow: rgba(255, 255, 255, 0.5);
}

@media (prefers-color-scheme: dark) {
    :root { --ipos-text: #eee; --ipos-shadow: rgba(0, 0, 0, 0.5); }
}

/* Dukungan class tema manual di blog kamu */
body.dark-mode :root, body.dark :root {
    --ipos-text: #e6e6e6; --ipos-shadow: rgba(0, 0, 0, 0.5);
}

#ipos-browser-info {
    color: var(--ipos-text);
    text-shadow: 1px 1px 1px var(--ipos-shadow);
    transition: color 0.3s ease;
}

#ipos-browser-info img:hover {
    transform: scale(1.2) rotate(5deg) !important;
}

/* Sembunyikan di layar kecil agar tidak berantakan */
@media (max-width: 600px) {
    #ipos-browser-info { display: none !important; }
}
`;
document.head.appendChild(style);
