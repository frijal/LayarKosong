(()=>{(function(){async function O(){let Z=document.getElementById("iposbrowser");if(!Z)return;let q=navigator.userAgent.toLowerCase(),x=q.includes("android")?"Android":/iphone|ipad|ipod/.test(q)?"iOS":q.includes("windows")?"Windows":q.includes("mac")?"macOS":q.includes("linux")?"Linux":"Unknown",H=q.includes("firefox")||q.includes("fxios")?"Firefox":q.includes("edg")?"Edge":q.includes("chrome")||q.includes("crios")?"Chrome":q.includes("safari")?"Safari":"Unknown",L=(j)=>{return`<img src="/ext/icons/${j==="iOS"||j==="macOS"?"macios":j.toLowerCase()}.svg" alt="${j}" onerror="this.src='/ext/icons/unknown.svg'" style="width:1.2em;height:1.2em;vertical-align:middle;margin-right:4px;display:inline-block;border-radius:2px;">`},k=(async()=>{let j=new AbortController,E=window.setTimeout(()=>j.abort(),2500),J=`https://hit.dalam.web.id/?url=${encodeURIComponent(window.location.pathname)}`;try{let K=await fetch(J,{method:"GET",mode:"cors",cache:"no-store",signal:j.signal});if(!K.ok)return null;let F=await K.json();return{t:Number(F.t||0),v:Number(F.v||0)}}catch{return null}finally{window.clearTimeout(E)}})(),w=new Promise((j)=>{let E=async(z)=>{try{let W=window.location.pathname.split("/").filter(Boolean).pop()||"index.html",C=W.endsWith(".html")?W:`${W}.html`,M=await z.getFor("iposbrowser.ts");for(let y in M){let $=M[y].find((G)=>G.slug===C);if($&&$.date)return new Date($.date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}}catch{}return null},J=window.siteDataProvider;if(J){E(J).then(j);return}let K=0,F=window.setInterval(async()=>{let z=window.siteDataProvider;if(z)window.clearInterval(F),E(z).then(j);else if(++K>30)window.clearInterval(F),j(null)},100)}),[Y,N]=await Promise.all([k,w]),U=Y?`
<span style="display:inline-flex;align-items:center;white-space:nowrap;" title="Views Title / Visit">
<strong style="margin-right:4px;">∞</strong>
${Number(Y.t||0).toLocaleString("id-ID")}
<small style="margin:0 4px;opacity:0.5;">-</small>
${Number(Y.v||0).toLocaleString("id-ID")}
</span>`:"",P=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<circle cx="32" cy="32" fill="currentColor" r="5"/>
<ellipse cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(60 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
<ellipse transform="rotate(120 32 32)" cx="32" cy="32" rx="24" ry="9" stroke="currentColor" stroke-width="4"/>
</svg>`,R=`
<svg viewBox="0 0 64 64" fill="none" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect fill="currentColor" height="48" rx="10" width="48" x="8" y="8"/>
<circle cx="22" cy="44" fill="white" r="5"/>
<path d="M17 30c9.4 0 17 7.6 17 17" stroke="white" stroke-linecap="round" stroke-width="6"/>
<path d="M17 18c16 0 29 13 29 29" stroke="white" stroke-linecap="round" stroke-width="6"/>
</svg>`,A=`
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<rect x="9" y="9" width="13" height="13" rx="2"/>
<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`,v=`
<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:1.2em;height:1.2em;display:block;overflow:visible;">
<polyline points="20 6 9 17 4 12"></polyline>
</svg>`;Z.innerHTML=`
<div id="pagecounter-wrapper" style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:15px;margin:20px 0 30px;font-size:0.85em;color:var(--text-muted);line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:inline-flex;align-items:center;white-space:nowrap;">${L(H)}${H}</span>

<span style="display:inline-flex;align-items:center;white-space:nowrap;">${L(x)}${x}</span>

${N?`
    <span style="display:inline-flex;align-items:center;white-space:nowrap;">
    \uD83D\uDDD3️ <span style="margin-left:4px;">${N}</span>
    </span>`:""}
    
    ${U}
    
    <span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap;margin-left:5px;">
    <button
    id="btn-copy-atom"
    aria-label="Copy Atom Feed URL"
    title="Salin URL Feed Atom"
    type="button"
    style="background:none;border:none;padding:0;cursor:pointer;color:#2563eb;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
    onmouseover="this.style.transform='scale(1.1)'"
    onmouseout="this.style.transform='scale(1)'"
    >${P}</button>
    
    <button
    id="btn-copy-rss"
    aria-label="Copy RSS Feed URL"
    title="Salin URL Feed RSS"
    type="button"
    style="background:none;border:none;padding:0;cursor:pointer;color:#f97316;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s;"
    onmouseover="this.style.transform='scale(1.1)'"
    onmouseout="this.style.transform='scale(1)'"
    >${R}</button>
    
    <button
    id="btn-copy-url"
    aria-label="Copy Page URL"
    title="Salin Tautan Artikel"
    type="button"
    style="background:none;border:none;padding:0;cursor:pointer;color:inherit;display:inline-flex;justify-content:center;align-items:center;transition:transform 0.2s,color 0.2s;"
    onmouseover="this.style.transform='scale(1.1)';this.style.color='var(--text-main)'"
    onmouseout="this.style.transform='scale(1)';this.style.color='inherit'"
    >${A}</button>
    </span>
    </div>`;let _=(j,E,J,K,F)=>{let z=document.getElementById(j);if(!z)return;z.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(E),z.innerHTML=v,z.title=K,window.setTimeout(()=>{z.innerHTML=J,z.title=F},2000)}catch(W){console.error("Gagal menyalin:",W)}})},Q=window.location.pathname.split("/").filter(Boolean),X=Q.length>=2?Q[0]:Q.length===1&&!Q[0].endsWith(".html")?Q[0]:"",B=window.location.origin,f=B+(X?`/${X}.rss`:"/rss.rss"),D=B+(X?`/${X}.atom`:"/atom.atom");_("btn-copy-url",window.location.href,A,"Tautan Artikel Tersalin!","Salin Tautan Artikel"),_("btn-copy-rss",f,R,"URL RSS Tersalin!","Salin URL Feed RSS"),_("btn-copy-atom",D,P,"URL Atom Tersalin!","Salin URL Feed Atom")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",O);else O()})();})();
