(function () {
  const d = document;

  /* -----------------------------------------------------------
     CREATE fb-root ONLY ONCE (REQUIRED BY FACEBOOK)
  ----------------------------------------------------------- */
  if (!d.getElementById("fb-root")) {
    const fr = d.createElement("div");
    fr.id = "fb-root";
    d.body.prepend(fr);
  }

  /* -----------------------------------------------------------
     WIDGET DEFINITIONS
     define what each container ID should render
  ----------------------------------------------------------- */
  const widgetMap = {
    like: (href) => `
      <div class="fb-like"
           data-href="${href}"
           data-layout="standard"
           data-share="true">
      </div>
    `,
    comment: (href) => `
      <div class="fb-comments"
           data-href="${href}"
           data-width="100%"
           data-numposts="5"
           data-lazy="true">
      </div>
    `
  };

  /* -----------------------------------------------------------
     FIND ALL WIDGET CONTAINERS
     (#like, #comment, PLUS any .fb-widget)
  ----------------------------------------------------------- */
  const containers = [];

  Object.keys(widgetMap).forEach((key) => {
    const el = d.getElementById(key);
    if (el) containers.push(el);
  });

  containers.push(...d.querySelectorAll(".fb-widget"));

  if (containers.length === 0) return;

  /* -----------------------------------------------------------
     LOAD FACEBOOK SDK (ONCE)
  ----------------------------------------------------------- */
  function loadFacebookSDK(cb) {
    if (window.FB && FB.XFBML) return cb && cb();

    const s = d.createElement("script");
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src = "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";
    s.onload = () => cb && cb();
    d.body.appendChild(s);
  }

  /* -----------------------------------------------------------
     LAZY FADE-IN IFRAME STYLE
  ----------------------------------------------------------- */
  const fadeCSS = d.createElement("style");
  fadeCSS.textContent = `
    .fb-lazy iframe { 
      opacity:0;
      transition:opacity .4s ease;
    }
    .fb-lazy iframe.fb-loaded { 
      opacity:1;
    }
  `;
  d.head.appendChild(fadeCSS);

  /* -----------------------------------------------------------
     RENDER WIDGET WHEN IN VIEWPORT
  ----------------------------------------------------------- */
  function renderWidget(el) {
    if (el.dataset.loaded) return;
    el.dataset.loaded = "1";

    const id = el.id;
    const href = el.dataset.href || location.href;

    const template = widgetMap[id];
    if (!template) return;

    el.classList.add("fb-lazy");
    el.innerHTML = template(href);

    loadFacebookSDK(() => {
      if (window.FB && FB.XFBML) FB.XFBML.parse(el);

      /* fade-in */
      const check = setInterval(() => {
        const iframe = el.querySelector("iframe");
        if (iframe) {
          iframe.classList.add("fb-loaded");
          clearInterval(check);
        }
      }, 200);
    });
  }

  /* -----------------------------------------------------------
     INTERSECTION OBSERVER
  ----------------------------------------------------------- */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          renderWidget(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "180px" }
  );

  containers.forEach((el) => observer.observe(el));
})();
