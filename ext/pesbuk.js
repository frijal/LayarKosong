(function () {
  const d = document, w = window;

  const container = d.getElementById("comment");
  if (!container) return;

  /* fb-root (avoid duplicate) */
  if (!d.getElementById("fb-root")) {
    const fr = d.createElement("div");
    fr.id = "fb-root";
    d.body.prepend(fr);
  }

  container.innerHTML = `
    <div id="fb-thread" style="display:none; margin-bottom:12px;"></div>
  `;

  const thread = d.getElementById("fb-thread");

  /* FADE-IN */
  const avatarCSS = d.createElement("style");
  avatarCSS.textContent = `
    #fb-thread iframe { opacity:0; transition:opacity .4s ease; }
    #fb-thread iframe.fb-loaded { opacity:1; }
  `;
  d.head.appendChild(avatarCSS);

  /* LOAD SDK */
  function loadFacebookSDK(callback) {
    if (window.FB && FB.XFBML) return callback && callback();

    const sdk = d.createElement("script");
    sdk.async = true;
    sdk.defer = true;
    sdk.crossOrigin = "anonymous";
    sdk.src =
      "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";
    sdk.onload = () => callback && callback();
    d.body.appendChild(sdk);
  }

  /* RENDER COMMENTS */
  function loadComments() {
    if (thread.dataset.loaded) return;
    thread.dataset.loaded = "1";

    thread.style.display = "block";
    thread.innerHTML = `
      <div class="fb-like"
        data-href="${location.href}"
        data-layout="standard"
        data-share="true"
        style="margin-bottom:12px;">
      </div>

      <div class="fb-comments"
        data-href="${location.href}"
        data-width="100%"
        data-numposts="5"
        data-lazy="true"
        data-mobile="true">
      </div>
    `;

    loadFacebookSDK(() => {
      /* THIS IS WHAT FIXES YOUR ISSUE */
      if (window.FB && FB.XFBML) FB.XFBML.parse(thread);

      const check = setInterval(() => {
        const ifr = thread.querySelector("iframe");
        if (ifr) {
          ifr.classList.add("fb-loaded");
          clearInterval(check);
        }
      }, 250);
    });
  }

  /* LAZY LOAD */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadComments();
          observer.disconnect();
        }
      });
    },
    { rootMargin: "180px" }
  );

  observer.observe(container);

})();

