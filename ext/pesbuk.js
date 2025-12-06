(function () {
  const d = document;
  const container = d.getElementById("comment");
  if (!container) return;

  /* -----------------------------------------------------------
     CREATE fb-root ONLY ONCE
  ----------------------------------------------------------- */
  if (!d.getElementById("fb-root")) {
    const fr = d.createElement("div");
    fr.id = "fb-root";
    d.body.prepend(fr);
  }

  /* -----------------------------------------------------------
     INITIAL WRAPPER
  ----------------------------------------------------------- */
  container.innerHTML = `
    <div id="fb-thread" style="display:none; margin-bottom:12px;"></div>
  `;

  const thread = d.getElementById("fb-thread");

  /* -----------------------------------------------------------
     FADE-IN EFFECT
  ----------------------------------------------------------- */
  const fadeCSS = d.createElement("style");
  fadeCSS.textContent = `
    #fb-thread iframe { 
      opacity: 0; 
      transition: opacity .4s ease; 
    }
    #fb-thread iframe.fb-loaded { 
      opacity: 1; 
    }
  `;
  d.head.appendChild(fadeCSS);

  /* -----------------------------------------------------------
     AUTO MOBILE DETECT
  ----------------------------------------------------------- */
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  /* -----------------------------------------------------------
     LOAD FACEBOOK SDK (NON-BLOCKING)
  ----------------------------------------------------------- */
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

  /* -----------------------------------------------------------
     LOAD COMMENTS + LIKE
     (Comments first → Like after comment box)
  ----------------------------------------------------------- */
  function loadComments() {
    if (thread.dataset.loaded) return;
    thread.dataset.loaded = "1";

    thread.style.display = "block";

    thread.innerHTML = `
      <!-- KOMENTAR DULU -->
      <div class="fb-comments"
        data-href="${location.href}"
        data-width="100%"
        data-numposts="5"
        data-lazy="true"
        data-mobile="${isMobile ? 'true' : 'false'}"
        style="margin-bottom:16px;">
      </div>

      <!-- LIKE DI BAWAH KOMENTAR -->
      <div class="fb-like"
        data-href="${location.href}"
        data-layout="standard"
        data-share="true"
        style="margin-top:16px;">
      </div>
    `;

    loadFacebookSDK(() => {
      /* render ulang FB widgets hanya pada thread */
      if (window.FB && FB.XFBML) FB.XFBML.parse(thread);

      /* fade-in effect */
      const check = setInterval(() => {
        const ifr = thread.querySelector("iframe");
        if (ifr) {
          ifr.classList.add("fb-loaded");
          clearInterval(check);
        }
      }, 250);
    });
  }

  /* -----------------------------------------------------------
     INTERSECTION OBSERVER (LAZY LOAD)
  ----------------------------------------------------------- */
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

