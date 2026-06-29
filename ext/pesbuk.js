(function(){let t=document,e=t.getElementById("pesbuk");if(!e)return;if(!t.getElementById("fb-root")){let n=t.createElement("div");n.id="fb-root",t.body.prepend(n)}let i=e.dataset.href||location.href;e.innerHTML=`
    <button id="fb-show-btn" style="
      padding:6px 10px; font-size:14px;
      border:1px solid #ccc; border-radius:6px;
      background:white; cursor:pointer; margin-bottom:12px;
    ">
      Tampilkan Komentar Facebook
    </button>
    <div id="fb-comments-box" style="display:none;"></div>
  `;let s=t.getElementById("fb-show-btn"),d=t.getElementById("fb-comments-box");function r(n){if(window.FB&&FB.XFBML)return n&&n();let o=t.createElement("script");o.async=!0,o.defer=!0,o.crossOrigin="anonymous",o.src="https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663",o.onload=()=>n&&n(),t.body.appendChild(o)}s.onclick=function(){s.style.display="none",d.style.display="block",d.innerHTML=`
      <div class="fb-comments"
           data-href="${i}"
           data-width="100%"
           data-numposts="5">
      </div>
    `,r(()=>{if(window.FB&&FB.XFBML)FB.XFBML.parse(d)})}})();
