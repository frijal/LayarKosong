(function () {
    // Inject styles
    const css = `
        /* Bubble */
        #gt-bubble {
            position: fixed;
            top: 15px;
            left: 15px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: var(--gt-bg);
            color: var(--gt-fg);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 22px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,.25);
            transition: all .2s ease;
        }
        #gt-bubble:hover {
            transform: scale(1.05);
        }

        /* Auto Dark / Light */
        :root {
            --gt-bg: #ffffff;
            --gt-fg: #000000;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --gt-bg: #1e1e1e;
                --gt-fg: #eaeaea;
            }
        }

        /* Auto-hide on mobile */
        @media (max-width: 480px) {
            #gt-bubble {
                display: none;
            }
        }

        /* Modal */
        #gt-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.55);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 999998;
        }
        #gt-box {
            background: var(--gt-bg);
            color: var(--gt-fg);
            width: 90%;
            max-width: 460px;
            padding: 20px;
            border-radius: 16px;
            box-shadow: 0 4px 18px rgba(0,0,0,.3);
        }
        #gt-close {
            float: right;
            cursor: pointer;
            font-size: 22px;
            margin-top: -12px;
            margin-right: -6px;
        }
        #gt-reset {
            margin-top: 15px;
            background: var(--gt-bg);
            color: var(--gt-fg);
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid var(--gt-fg);
            cursor: pointer;
            font-size: 14px;
        }
    `;
    const sty = document.createElement("style");
    sty.innerHTML = css;
    document.head.appendChild(sty);

    // Create bubble
    const bubble = document.createElement("div");
    bubble.id = "gt-bubble";
    bubble.innerHTML = "🌐";

    // Create modal
    const modal = document.createElement("div");
    modal.id = "gt-modal";
    modal.innerHTML = `
        <div id="gt-box">
            <div id="gt-close">✖</div>
            <h3 style="margin-top:0;font-size:18px">Translate halaman ini</h3>
            <div id="google_translate_element"></div>
            <button id="gt-reset">Reset Bahasa</button>
        </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(modal);

    // Bubble open modal
    bubble.addEventListener("click", () => {
        modal.style.display = "flex";
    });
    document.getElementById("gt-close").addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Reset language
    document.getElementById("gt-reset").addEventListener("click", () => {
        const frame = document.querySelector("iframe.goog-te-menu-frame");
        document.cookie = "googtrans=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
        location.reload();
    });

    // Google Translate Loader
    window.googleTranslateElementInit = function () {
        new google.translate.TranslateElement({
            pageLanguage: "id",
            autoDisplay: false
        }, "google_translate_element");
    };

    // Load script dynamically
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(s);

    // Auto enable when <div id="terjemah"></div> exists
    const target = document.getElementById("terjemah");
    if (target) {
        target.appendChild(bubble);
    }
})();
