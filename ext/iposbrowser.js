(()=>{(function(){async function h(){let u=document.getElementById("iposbrowser");if(!u)return;let t=navigator.userAgent.toLowerCase(),w=t.includes("android")?"Android":/iphone|ipad|ipod/.test(t)?"iOS":t.includes("windows")?"Windows":t.includes("mac")?"macOS":t.includes("linux")?"Linux":"Unknown",y=t.includes("firefox")||t.includes("fxios")?"Firefox":t.includes("edg")?"Edge":t.includes("chrome")||t.includes("crios")?"Chrome":t.includes("safari")?"Safari":"Unknown",f=(e)=>`<img src="/ext/icons/${e==="iOS"||e==="macOS"?"macios":e.toLowerCase()}.svg" alt="${e}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`,k=(async()=>{let e=new AbortController,o=window.setTimeout(()=>e.abort(),2500),a=`https://hit.dalam.web.id/?url=${encodeURIComponent(window.location.pathname)}`;try{let l=await fetch(a,{method:"GET",mode:"cors",cache:"no-store",signal:e.signal});if(!l.ok)return null;let r=await l.json();return{t:Number(r.t||0),v:Number(r.v||0)}}catch{return null}finally{window.clearTimeout(o)}})(),b=new Promise((e)=>{let o=async(c)=>{try{let m=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",E=m.endsWith(".html")?m:`${m}.html`,x=await c.getFor("iposbrowser.ts");for(let M in x){let p=x[M].find((R)=>R.slug===E);if(p&&p.date)return new Date(p.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch{}return null},a=window.siteDataProvider;if(a){o(a).then(e);return}let l=0,r=window.setInterval(async()=>{let c=window.siteDataProvider;if(c)window.clearInterval(r),o(c).then(e);else if(++l>30)window.clearInterval(r),e(null)},100)}),[d,g]=await Promise.all([k,b]),S=d?`
<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views Title / Visit">
<strong style="margin-right:4px;">∞</strong>
${Number(d.t||0).toLocaleString("id-ID")}
<small style="margin:0 4px;opacity:0.5;">-</small>
${Number(d.v||0).toLocaleString("id-ID")}
</span>`:"",T=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<circle cx="32" cy="32" fill="currentColor" r="5"/>
<ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
</svg>`,C=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/>
<circle cx="22" cy="44" fill="white" r="5"/>
<path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/>
<path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/>
</svg>`,v=`
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect x="9" y="9" width="13" height="13" rx="2"/>
<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`,I=`
<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>`,i=window.location.pathname.split("/").filter(Boolean),s=i.length>=2?i[0]:i.length===1&&!i[0].endsWith(".html")?i[0]:"",L=s?`/${s}.rss`:"/rss.rss",P=s?`/${s}.atom`:"/atom.atom",U=`/lainnya/feed-preview?feed=${encodeURIComponent(L)}`,D=`/lainnya/feed-preview?feed=${encodeURIComponent(P)}`;u.innerHTML=`
<div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:inline-flex;align-items:center;white-space:nowrap;">${f(y)}${y}</span>

<span style="display:inline-flex;align-items:center;white-space:nowrap;">${f(w)}${w}</span>

${g?`
    <span style="display:inline-flex;align-items:center;white-space:nowrap;">
    \uD83D\uDDD3️ <span style="margin-left:4px;">${g}</span>
    </span>`:""}

    ${S}

    <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
    <!-- Link langsung ke halaman Preview Feed Interaktif -->
    <a
    aria-label="Buka Interaktif Atom Feed"
    title="Lihat Feed Atom"
    href="${D}"
    target="_blank"
    rel="noopener noreferrer"
    style="color:#2563eb;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
    onmouseover="this.style.transform='scale(1.1)'"
    onmouseout="this.style.transform='scale(1)'"
    >${T}</a>

    <a
    aria-label="Buka Interaktif RSS Feed"
    title="Lihat Feed RSS"
    href="${U}"
    target="_blank"
    rel="noopener noreferrer"
    style="color:#f97316;text-decoration:none;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
    onmouseover="this.style.transform='scale(1.1)'"
    onmouseout="this.style.transform='scale(1)'"
    >${C}</a>

    <!-- Tombol Copy URL Artikel tetap dipertahankan -->
    <button
    id="btn-copy-url"
    aria-label="Copy Page URL"
    title="Salin Tautan Artikel"
    type="button"
    style="background:none;border:none;padding:0;cursor:pointer;color:inherit;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s,color 0.2s;"
    onmouseover="this.style.transform='scale(1.1)';this.style.color='var(--text-main)'"
    onmouseout="this.style.transform='scale(1)';this.style.color='inherit'"
    >${v}</button>
    </span>
    </div>`;let n=document.getElementById("btn-copy-url");if(n)n.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(window.location.href),n.innerHTML=I,n.title="Tautan Artikel Tersalin!",window.setTimeout(()=>{n.innerHTML=v,n.title="Salin Tautan Artikel"},2000)}catch(e){console.error("Gagal menyalin:",e)}})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",h);else h()})();})();
