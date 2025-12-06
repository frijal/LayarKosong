(function () {
  const d = document, w = window;

  const container = d.getElementById("comment");
  if (!container) return;

  /* INITIAL WRAPPER -------------------------------------------------- */
  container.innerHTML = `
    <div id="fb-root"></div>
    <div id="fb-thread" style="display:none; margin-bottom:12px;"></div>
  `;

  const thread = d.getElementById("fb-thread");

  /* FADE-IN IFRAME --------------------------------------------------- */
  const avatarCSS = d.createElement("style");
  avatarCSS.textContent = `
    #fb-thread iframe {
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    #fb-thread iframe.fb-loaded {
      opacity: 1;
    }
  `;
  d.head.appendChild(avatarCSS);

  /* LOAD FACEBOOK SDK ------------------------------------------------ */
  function loadFacebookSDK(callback) {
    if (window.FB) return callback && callback(); // prevent double-load

    const sdk = d.createElement("script");
    sdk.async = true;
    sdk.defer = true;
    sdk.crossOrigin = "anonymous";
    sdk.src =
      "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";

    sdk.onload = () => callback && callback();
    d.body.appendChild(sdk);
  }

  /* LOAD LIKE + COMMENTS --------------------------------------------- */
  function loadComments() {
    if (thread.dataset.loaded) return;
    thread.dataset.loaded = "1";

    thread.style.display = "block";

    thread.innerHTML = `
      <div class="fb-like"
           data-href="${location.href}"
           data-width=""
           data-layout="standard"
           data-action="like"
           data-size=""
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
      const iframeCheck = setInterval(() => {
        const fbIframe = thread.querySelector("iframe");
        if (fbIframe) {
          fbIframe.classList.add("fb-loaded");
          clearInterval(iframeCheck);
        }
      }, 250);
    });
  }

  /* INTERSECTION OBSERVER -------------------------------------------- */
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

