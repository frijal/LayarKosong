(function () {
  const d = document, w = window;

  const container = d.getElementById("comment");
  if (!container) return;

  /* -----------------------------------------
     2. INITIAL HTML (hidden FB + collapse btn)
  ------------------------------------------ */
  container.innerHTML = `
    <div id="fb-root"></div>

    <div id="fb-thread" style="display:none; margin-bottom:12px;"></div>

    <button id="fb-collapse-btn"
      style="
        display:none;
        padding:6px 12px;
        font-size:14px;
        border:1px solid #ccc;
        border-radius:6px;
        background:white;
        cursor:pointer;
        margin-bottom:10px;
      ">
      Hide Comments ▲
    </button>
  `;

  const thread = d.getElementById("fb-thread");
  const collapseBtn = d.getElementById("fb-collapse-btn");


  /* -----------------------------------------
     3. LAZY FADE-IN AVATAR (iframe)
  ------------------------------------------ */
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


  /* -----------------------------------------
     4. LOAD FACEBOOK SDK
  ------------------------------------------ */
  function loadFacebookSDK(callback) {
    const sdk = d.createElement("script");
    sdk.async = true;
    sdk.defer = true;
    sdk.crossOrigin = "anonymous";
    sdk.src = "https://connect.facebook.net/id_ID/sdk.js#xfbml=1&version=v24.0&appId=700179713164663";

    sdk.onload = () => callback && callback();
    d.body.appendChild(sdk);
  }


  /* -----------------------------------------
     5. LOAD COMMENTS WHEN IN VIEWPORT
  ------------------------------------------ */
  function loadComments() {
    if (thread.dataset.loaded) return;
    thread.dataset.loaded = "1";

    thread.style.display = "block";

    thread.innerHTML = `
      <div class="fb-comments"
        data-href="${location.href}"
        data-width="100%"
        data-numposts="5"
        data-lazy="true">
      </div>
    `;

    loadFacebookSDK(() => {
      collapseBtn.style.display = "inline-block";

      const iframeCheck = setInterval(() => {
        const fbIframe = thread.querySelector("iframe");
        if (fbIframe) {
          fbIframe.classList.add("fb-loaded");
          clearInterval(iframeCheck);
        }
      }, 300);
    });
  }


  /* -----------------------------------------
     6. COLLAPSE BUTTON
  ------------------------------------------ */
  collapseBtn.onclick = function () {
    if (thread.style.display === "none") {
      thread.style.display = "block";
      collapseBtn.innerHTML = "Hide Comments ▲";
    } else {
      thread.style.display = "none";
      collapseBtn.innerHTML = "Show Comments ▼";
    }
  };


  /* -----------------------------------------
     7. INTERSECTION OBSERVER
  ------------------------------------------ */
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
