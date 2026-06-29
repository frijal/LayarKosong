(function(){let v=document,J=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light",E=v.createElement("script");E.async=!0,E.type="application/javascript",E.src="https://news.google.com/swg/js/v1/swg-basic.js",v.head.appendChild(E),(self.SWG_BASIC=self.SWG_BASIC||[]).push((j)=>{j.init({type:"NewsArticle",isPartOfType:["Product"],isPartOfProductId:"CAowztjDDA:openaccess",clientOptions:{theme:J,lang:"id"}})});let H=v.getElementById("pesbukdiskus");if(!H)return;H.innerHTML=`
        <div style="margin-bottom:12px;">
            <button id="btn-fb" style="padding:6px 12px; margin-right:6px; cursor:pointer;">Facebook</button>
            <button id="btn-dsq" style="padding:6px 12px; cursor:pointer;">Disqus</button>
        </div>
        <div id="fb-box" style="display:none; margin-bottom:12px;"></div>
        <div id="dsq-box" style="display:none; margin-bottom:12px;"></div>
    `;let I=v.getElementById("btn-fb"),K=v.getElementById("btn-dsq"),A=v.getElementById("fb-box"),C=v.getElementById("dsq-box");if(!v.getElementById("fb-root")){let j=v.createElement("div");j.id="fb-root",v.body.prepend(j)}let G=H.dataset.href||location.href;function L(j){if(window.FB)return j&&j();let z=v.createElement("script");z.async=!0,z.defer=!0,z.crossOrigin="anonymous",z.src="https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v25.0&appId=175216696195384",z.onload=()=>{if(window.FB)FB.init({appId:"175216696195384",xfbml:!0,version:"v25.0"}),j&&j()},v.body.appendChild(z)}function M(j){if(window.DISQUS)return j&&j();window.disqus_config=function(){this.page.url=G,this.page.identifier=G};let z=v.createElement("script");z.src="https://layarkosong.disqus.com/embed.js",z.setAttribute("data-timestamp",+new Date),z.async=!0,z.onload=()=>j&&j(),v.body.appendChild(z)}I.onclick=function(){if(C.style.display="none",A.style.display="block",!A.dataset.loaded){A.dataset.loaded="1";let j=G.includes("http")?G:"https://dalam.web.id";A.innerHTML=`
            <div class="fb-comments"
                data-href="${j}"
                data-width="100%"
                data-numposts="5">
            </div>
        `,L(()=>{setTimeout(()=>{if(window.FB)FB.XFBML.parse(A)},100)})}},K.onclick=function(){if(A.style.display="none",C.style.display="block",!C.dataset.loaded)C.dataset.loaded="1",C.innerHTML='<div id="disqus_thread"></div>',M()},I.click()})();
