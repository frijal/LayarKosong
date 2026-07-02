/**
 * =================================================================================
 * PageCounter v6.5 (Ultra-Optimized Edition) - Crafted for Frijal
 * =================================================================================
 */

(function (): void {
  'use strict';

  interface PageStats {
    v: number;
    t: number;
  }

  async function initIposBrowser(): Promise<void> {
    const target = document.getElementById('iposbrowser');
    if (!target) return; // Kalau wadahnya nggak ada di HTML, mending rebahan aja.

    // --- A. DETEKSI USER AGENT (Cepat & Ringan) ---
    const ua = navigator.userAgent.toLowerCase();
    
    // Deteksi OS
    const os = ua.includes('android') ? 'Android' :
               /iphone|ipad|ipod/.test(ua) ? 'iOS' :
               ua.includes('windows') ? 'Windows' :
               ua.includes('mac') ? 'macOS' :
               ua.includes('linux') ? 'Linux' : 'Unknown';

    // Deteksi Browser
    const browser = (ua.includes('firefox') || ua.includes('fxios')) ? 'Firefox' :
                    ua.includes('edg') ? 'Edge' :
                    (ua.includes('chrome') || ua.includes('crios')) ? 'Chrome' :
                    ua.includes('safari') ? 'Safari' : 'Unknown';

    const getIcon = (name: string) => {
      const file = (name === 'iOS' || name === 'macOS') ? 'macios' : name.toLowerCase();
      // Tambah border-radius jaga-jaga kalau SVG-nya punya background bawaan
      return `<img src="/ext/icons/${file}.svg" alt="${name}" onerror="this.src='/ext/icons/unknown.svg'" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`;
    };

    // --- B. FETCH STATS (Jalan Asinkron di Background) ---
    const fetchStats = fetch(`/hit?url=${encodeURIComponent(window.location.pathname)}`)
      .then(res => res.ok ? res.json() as Promise<PageStats> : null)
      .catch(() => null); // Silent fail, rapopo kalau server analitik lagi down

    // --- C. AMBIL TANGGAL (Lewat Master Data Provider) ---
    const fetchDate = new Promise<string | null>((resolve) => {
      
      const getMatchDate = async (dp: any): Promise<string | null> => {
        try {
          const currentPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
          const fileName = currentPath.endsWith('.html') ? currentPath : `${currentPath}.html`;
          
          // 🔥 PANGGIL JALUR TOL: Gunakan getFor agar data di-map sesuai UI schema
          const data = await dp.getFor('iposbrowser.ts');

          for (const cat in data) {
            // Karena sudah melewati mapper() di provider,
            // datanya bukan lagi array [x, y, z], tapi object { slug, date }
            const match = data[cat].find((item: any) => item.slug === fileName);
            
            if (match && match.date) {
              return new Date(match.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            }
          }
        } catch (err) {
          // Silent catch
        }
        return null;
      };

      const dp = (window as any).siteDataProvider;
      
      if (dp) {
        getMatchDate(dp).then(resolve);
        return;
      }

      let attempts = 0;
      const timer = setInterval(async () => {
        const dynamicDp = (window as any).siteDataProvider;
        if (dynamicDp) {
          clearInterval(timer);
          getMatchDate(dynamicDp).then(resolve);
        } else if (++attempts > 30) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });

    // --- D. EKSEKUSI PARALEL & RENDER DOM ---
    // Tunggu data stats dan tanggal selesai diekstrak barengan
    const [stats, articleDate] = await Promise.all([fetchStats, fetchDate]);

    // Ukuran SVG dibikin pakai 'em' biar ngikutin ukuran font (lebih proporsional)
    const atomSVG = `<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><circle cx="32" cy="32" fill="currentColor" r="5"/><ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/><ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/></svg>`;
    const rssSVG = `<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;"><rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/><circle cx="22" cy="44" fill="white" r="5"/><path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/><path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/></svg>`;

    target.innerHTML = `
      <div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${getIcon(browser)}${browser}</span>
        <span style="display:inline-flex;align-items:center;white-space:nowrap;">${getIcon(os)}${os}</span>
        
        ${articleDate ? `<span style="display:inline-flex;align-items:center;white-space:nowrap;">🗓️ <span style="margin-left:4px;">${articleDate}</span></span>` : ''}
        
        ${stats ? `<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views / Visitors">
          <strong style="margin-right:4px;">\u221E</strong> 
          ${stats.v.toLocaleString('id-ID')} <small style="margin:0 4px;opacity:0.5;">|</small> ${stats.t.toLocaleString('id-ID')}
        </span>` : ''}
        
        <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
          <a aria-label="Atom Feed" rel="noopener noreferrer" title="Atom Feed" href="/atom.xml" target="_blank" style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${atomSVG}
          </a>
          <a aria-label="RSS Feed" rel="noopener noreferrer" title="RSS Feed" href="/rss.xml" target="_blank" style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            ${rssSVG}
          </a>
        </span>

      </div>`;
  }

  // --- E. SMART INITIALIZATION (Bypass Jebakan Batman DOMContentLoaded) ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIposBrowser);
  } else {
    // Kalau HTML udah selesai dimuat, ndak usah nunggu lama, langsung hajar!
    initIposBrowser();
  }

})();
