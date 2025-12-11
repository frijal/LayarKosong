(function () {
  const d = document;
  const container = d.getElementById("pesbukdiskus");
  if (!container) return;

  // --------------------------------------------------
  // INITIAL HTML (tabs + hidden comment boxes)
  // --------------------------------------------------
  container.innerHTML = `
    <div style="margin-bottom:12px;">
      <button id="btn-fb" style="padding:6px 12px; margin-right:6px; cursor:pointer;">Facebook</button>
      <button id="btn-dsq" style="padding:6px 12px; cursor:pointer;">Disqus</button>
    </div>
    <div id="fb-box" style="display:none; margin-bottom:12px;"></div>
    <div id="dsq-box" style="display:none; margin-bottom:12px;"></div>
  `;

  const btnFB = d.getElementById("btn-fb");
  const btnDSQ = d.getElementById("btn-dsq");
  const fbBox = d.getElementById("fb-box");
  const dsqBox = d.getElementById("dsq-box");

  // --------------------------------------------------
  // Create fb-root only once
  // --------------------------------------------------
  if (!d.getElementById("fb-root")) {
    const fbroot = d.createElement("div");
    fbroot.id = "fb-root";
    d.body.prepend(fbroot);
  }

  // --------------------------------------------------
  // Auto URL detection
  // --------------------------------------------------
  const url = container.dataset.href || location.href;

  // --------------------------------------------------
  // Load Facebook SDK
  // --------------------------------------------------
  function loadFacebook(callback) {
    if (window.FB && FB.XFBML) return callback && callback();
    const s = d.createElement("script");
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src = "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";
    s.onload = () => callback && callback();
    d.body.appendChild(s);
  }

  // --------------------------------------------------
  // Load Disqus
  // --------------------------------------------------
  function loadDisqus(callback) {
    if (window.DISQUS) return callback && callback();

    window.disqus_config = function () {
      this.page.url = url;
      this.page.identifier = url;
    };

    const s = d.createElement("script");
    s.src = "https://layarkosong.disqus.com/embed.js";
    s.setAttribute("data-timestamp", +new Date());
    s.async = true;
    s.onload = () => callback && callback();
    d.body.appendChild(s);
  }

  // --------------------------------------------------
  // Event handlers
  // --------------------------------------------------
  btnFB.onclick = function () {
    dsqBox.style.display = "none";
    fbBox.style.display = "block";

    if (!fbBox.dataset.loaded) {
      fbBox.dataset.loaded = "1";
      fbBox.innerHTML = `
        <div class="fb-comments"
             data-href="${url}"
             data-width="100%"
             data-numposts="5">
        </div>
      `;
      loadFacebook(() => { if (window.FB && FB.XFBML) FB.XFBML.parse(fbBox); });
    }
  };

  btnDSQ.onclick = function () {
    fbBox.style.display = "none";
    dsqBox.style.display = "block";

    if (!dsqBox.dataset.loaded) {
      dsqBox.dataset.loaded = "1";
      dsqBox.innerHTML = `<div id="disqus_thread"></div>`;
      loadDisqus();
    }
  };

  // Optional: show Facebook tab by default
  btnFB.click();
})();

