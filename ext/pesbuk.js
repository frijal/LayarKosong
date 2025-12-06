(function () {
  const d = document;

  // --- CREATE fb-root AUTOMATICALLY ---
  if (!d.getElementById("fb-root")) {
    const fbroot = d.createElement("div");
    fbroot.id = "fb-root";
    d.body.prepend(fbroot);
  }

  // --- AUTO INSERT FB WIDGETS ---
  const likeBox = d.getElementById("like");
  const commentBox = d.getElementById("comment");

  if (likeBox) {
    likeBox.innerHTML = `
      <div class="fb-like"
        data-href="${location.href}"
        data-layout="standard"
        data-share="true">
      </div>
    `;
  }

  if (commentBox) {
    commentBox.innerHTML = `
      <div class="fb-comments"
        data-href="${location.href}"
        data-width="100%"
        data-numposts="5">
      </div>
    `;
  }

  // --- FACEBOOK SDK LOADER ---
  function loadSDK(cb) {
    if (window.FB && FB.XFBML) return cb();

    const s = d.createElement("script");
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src = "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";
    s.onload = cb;
    d.body.appendChild(s);
  }

  // --- LAZY LOAD (Observer) ---
  const lazyTarget = likeBox || commentBox;
  if (!lazyTarget) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        loadSDK(() => {
          if (window.FB && FB.XFBML) {
            FB.XFBML.parse(); // parses ALL widgets: like + comment
          }
        });
        obs.disconnect();
      }
    });
  }, { rootMargin: "200px" });

  obs.observe(lazyTarget);
})();
