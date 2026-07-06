/**
 * =================================================================================
 * PageCounter v6.6 (Ultra-Optimized + Copy URL Feature) - Crafted for Frijal
 * =================================================================================
 */

(function (): void {
  'use strict';

interface PageStats {
  t: number; // Angka Artikel (150)
v: number; // Angka Global (Ribuan)
}

async function initIposBrowser(): Promise<void> {
  const target = document.getElementById('iposbrowser');
  if (!target) return;

  // --- A. DETEKSI USER AGENT ---
  const ua = navigator.userAgent.toLowerCase();
  const os = ua.includes('android') ? 'Android' : /iphone|ipad|ipod/.test(ua) ? 'iOS' : ua.includes('windows') ? 'Windows' : ua.includes('mac') ? 'macOS' : ua.includes('linux') ? 'Linux' : 'Unknown';
  const browser = (ua.includes('firefox') || ua.includes('fxios')) ? 'Firefox' : ua.includes('edg') ? 'Edge' : (ua.includes('chrome') || ua.includes('crios')) ? 'Chrome' : ua.includes('safari') ? 'Safari' : 'Unknown';

const getIcon = (name: string) => {
  const file = (name === 'iOS' || name === 'macOS') ? 'macios' : name.toLowerCase();
  return `<img src="/ext/icons/${file}.svg" alt="${name}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`;
};

// --- B. FETCH STATS ---
const workerURL = `https://layarkosong-counter.frijal.workers.dev/?url=${encodeURIComponent(window.location.pathname)}`;
const fetchStats = fetch(workerURL)
.then(res => res.ok ? res.json() as Promise<PageStats> : null)
.catch(() => null);

// --- C. AMBIL TANGGAL ---
const fetchDate = new Promise<string | null>((resolve) => {
  const getMatchDate = async (dp: any): Promise<string | null> => {
    try {
      const currentPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
      const fileName = currentPath.endsWith('.html') ? currentPath : `${currentPath}.html`;
      const data = await dp.getFor('iposbrowser.ts');
      for (const cat in data) {
        const match = data[cat].find((item: any) => item.slug === fileName);
        if (match && match.date) return new Date(match.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch (err) {}
    return null;
  };
  const dp = (window as any).siteDataProvider;
  if (dp) { getMatchDate(dp).then(resolve); return; }
  let attempts = 0;
  const timer = setInterval(async () => {
    const dynamicDp = (window as any).siteDataProvider;
    if (dynamicDp) { clearInterval(timer); getMatchDate(dynamicDp).then(resolve); }
    else if (++attempts > 30) { clearInterval(timer); resolve(null); }
  }, 100);
});

// --- D. EKSEKUSI PARALEL & RENDER ---
const [stats, articleDate] = await Promise.all([fetchStats, fetchDate]);

// Variabel stat html
const statsHTML = stats ? `
<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Halaman / Total Global">
<strong style="margin-right:4px;">\u221E</strong>
${stats.t.toLocaleString('id-ID')} <small style="margin:0 4px;opacity:0.5;">-</small> ${stats.v.toLocaleString('id-ID')}
</span>` : '';

const atomSVG = `<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><circle cx="32" cy="32" fill="currentColor" r="5"/><ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/></svg>`;
const rssSVG  = `<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/><circle cx="22" cy="44" fill="white" r="5"/><path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/><path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/></svg>`;
const copySVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 469 511.53" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" style="display:block;overflow:visible;"><path fill="currentColor" fill-rule="nonzero" d="M143.57 91.42h273.27c28.7 0 52.16 23.46 52.16 52.16v315.79c0 28.57-23.58 52.16-52.16 52.16H143.57c-28.69 0-52.15-23.47-52.15-52.16V143.58c0-28.72 23.44-52.16 52.15-52.16zm122.42 169.95c-9.85 13.65-30.59-1.26-20.8-14.94l18.33-25.47a59.675 59.675 0 0 1 17.1-15.96 60.646 60.646 0 0 1 22.02-8.22c16.4-2.67 32.32 1.53 44.79 10.49 12.47 8.98 21.51 22.72 24.19 39.12a60.594 60.594 0 0 1-.79 23.49 59.474 59.474 0 0 1-9.68 21.29l-18.32 25.47c-9.83 13.67-30.61-1.28-20.77-14.95l18.3-25.46c2.71-3.76 4.55-7.92 5.55-12.2 1.04-4.45 1.17-9.06.45-13.51-1.55-9.47-6.73-17.37-13.86-22.5-7.14-5.14-16.28-7.53-25.73-5.98-4.45.73-8.77 2.32-12.67 4.72a34.15 34.15 0 0 0-9.8 9.14l-18.31 25.47zm21.12 6.53c9.9-13.61 30.51 1.27 20.71 14.95l-34.04 51.43c-9.84 13.58-30.49-1.29-20.72-14.94l34.05-51.44zm6.99 74.15c9.85-13.67 30.61 1.28 20.78 14.95l-17.97 24.98c-4.74 6.58-10.59 11.94-17.11 15.96a60.398 60.398 0 0 1-22.02 8.22c-16.4 2.67-32.31-1.53-44.78-10.49-12.47-8.97-21.51-22.72-24.19-39.12a60.45 60.45 0 0 1 .78-23.46 59.833 59.833 0 0 1 9.69-21.27l18.01-25.09c9.87-13.59 30.54 1.35 20.75 14.99l-17.98 24.99a33.93 33.93 0 0 0-5.56 12.19 34.893 34.893 0 0 0-.43 13.5l.01.07c1.54 9.43 6.71 17.32 13.84 22.44 7.13 5.13 16.24 7.53 25.69 6l.07-.02c4.44-.73 8.76-2.32 12.63-4.71 3.74-2.3 7.1-5.37 9.81-9.14l17.98-24.99zm-257.52 8.77c0 10.1-8.19 18.29-18.29 18.29S0 360.92 0 350.82V52.16C0 23.44 23.44 0 52.16 0h273.26c10.1 0 18.29 8.19 18.29 18.29s-8.19 18.29-18.29 18.29H52.16c-8.54 0-15.58 7.04-15.58 15.58v298.66zM416.84 128H143.57c-8.53 0-15.57 7.04-15.57 15.58v315.79c0 8.52 7.06 15.58 15.57 15.58h273.27c8.59 0 15.58-6.99 15.58-15.58V143.58c0-8.52-7.06-15.58-15.58-15.58z"/></svg>`;

target.innerHTML = `
<div id="pagecounter-wrapper" style="...">
<span style="...">${getIcon(browser)}${browser}</span>
<span style="...">${getIcon(os)}${os}</span>
${articleDate ? `<span style="...">🗓️ <span>${articleDate}</span></span>` : ''}
${statsHTML}
<span style="...">
</span>
</div>`;
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initIposBrowser); }
else { initIposBrowser(); }
})();
