(function () {
  const d = document;

  /* --------------------------------------------------
     Target widget container
  -------------------------------------------------- */
  const box = d.getElementById("pesbuk");
  if (!box) return;

  /* --------------------------------------------------
     Create fb-root automatically (only once)
  -------------------------------------------------- */
  if (!d.getElementById("fb-root")) {
    const fbroot = d.createElement("div");
    fbroot.id = "fb-root";
    d.body.prepend(fbroot);
  }

  /* --------------------------------------------------
     Auto-detect URL from data-href or location.href
  -------------------------------------------------- */
  const url = box.dataset.href || location.href;

  /* --------------------------------------------------
     Fill LIKE + COMMENT widgets automatically
  -------------------------------------------------- */
  box.innerHTML = `
    <!-- LIKE BUTTON -->
    <div class="fb-like"
         data-href="${url}"
         data-layout="standard"
         data-share="true"
         style="margin-bottom:16px;">
    </div>

    <!-- COMMENT BOX -->
    <div class="fb-comments"
         data-href="${url}"
         data-width="100%"
         data-numposts="5">
    </div>
  `;

  /* --------------------------------------------------
     Load Facebook SDK (only once)
  -------------------------------------------------- */
  function loadSDK() {
    if (window.FB && FB.XFBML) {
      FB.XFBML.parse(box);
      return;
    }

    const s = d.createElement("script");
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src =
      "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";

    s.onload = () => {
      if (window.FB && FB.XFBML) FB.XFBML.parse(box);
    };

    d.body.appendChild(s);
  }

  loadSDK();
})();
