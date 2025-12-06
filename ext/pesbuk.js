(function () {
  const FB_APP_ID = "700179713164663";
  const FB_LOCALE = "id_ID";
  const FB_SDK_URL =
    `https://connect.facebook.net/${FB_LOCALE}/sdk.js#xfbml=1&version=v24.0&appId=${FB_APP_ID}`;

  /* Insert FB Root */
  const fbRoot = document.createElement("div");
  fbRoot.id = "fb-root";
  document.body.appendChild(fbRoot);

  /* Async load Facebook SDK */
  function loadFbSdk() {
    if (window.fbAsyncInitLoaded) return;
    window.fbAsyncInitLoaded = true;

    const s = document.createElement("script");
    s.src = FB_SDK_URL;
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    document.body.appendChild(s);
  }

  /* Lazy Load Widgets */
  function lazyLoadFbWidget(el, html) {
    const obs = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.innerHTML = html;
            loadFbSdk();
            observer.unobserve(el);
          }
        });
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
  }

  /* LIKE Widget */
  const likeEl = document.getElementById("like");
  if (likeEl) {
    lazyLoadFbWidget(
      likeEl,
      `
        <div class="fb-like"
          data-href="${likeEl.dataset.href || window.location.href}"
          data-layout="${likeEl.dataset.layout || 'standard'}"
          data-action="${likeEl.dataset.action || 'like'}"
          data-size="${likeEl.dataset.size || 'small'}"
          data-share="${likeEl.dataset.share || 'true'}"
          data-mobile="true">
        </div>
      `
    );
  }

  /* COMMENT Widget */
  const commentEl = document.getElementById("comment");
  if (commentEl) {
    lazyLoadFbWidget(
      commentEl,
      `
        <div class="fb-comment"
          data-href="${commentEl.dataset.href || window.location.href}"
          data-width="${commentEl.dataset.width || '100%'}"
          data-numposts="${commentEl.dataset.numposts || '5'}"
          data-mobile="true">
        </div>
      `
    );
  }
})();

