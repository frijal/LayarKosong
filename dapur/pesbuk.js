(function () {
  const d = document;
  const container = d.getElementById("pesbuk");
  if (!container) return;

  // Create fb-root only once
  if (!d.getElementById("fb-root")) {
    const fbroot = d.createElement("div");
    fbroot.id = "fb-root";
    d.body.prepend(fbroot);
  }

  // Auto-detect URL
  const url = container.dataset.href || location.href;

  // Hide container initially
  container.innerHTML = `
    <button id="fb-show-btn" style="
      padding:6px 10px; font-size:14px;
      border:1px solid #ccc; border-radius:6px;
      background:white; cursor:pointer; margin-bottom:12px;
    ">
      Tampilkan Komentar Facebook
    </button>
    <div id="fb-comments-box" style="display:none;"></div>
  `;

  const btn = d.getElementById("fb-show-btn");
  const box = d.getElementById("fb-comments-box");

  function loadSDK(callback) {
    if (window.FB && FB.XFBML) return callback && callback();
    const s = d.createElement("script");
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src = "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";
    s.onload = () => callback && callback();
    d.body.appendChild(s);
  }

  btn.onclick = function () {
    btn.style.display = "none"; // hide button
    box.style.display = "block";

    box.innerHTML = `
      <div class="fb-comments"
           data-href="${url}"
           data-width="100%"
           data-numposts="5">
      </div>
    `;

    loadSDK(() => {
      if (window.FB && FB.XFBML) FB.XFBML.parse(box);
    });
  };
})();

