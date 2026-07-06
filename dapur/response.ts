/**
 * Twikoo Loader for Layar Kosong
 * Versi: 1.7.13-turnstile-safe
 * Target: #response
 */

interface TwikooInitOptions {
  envId: string;
  el: string;
  lang?: string;
}

interface TwikooApi {
  init(options: TwikooInitOptions): Promise<void> | void;
}

interface TurnstileApi {
  reset?: () => void;
}

interface LayarKosongTwikooState {
  loading: boolean;
  initializedContainers: WeakSet<Element>;
}

type LayarKosongWindow = Window & {
  twikoo?: TwikooApi;
  turnstile?: TurnstileApi;
  __LK_TWIKOO__?: LayarKosongTwikooState;
  __LK_TURNSTILE_GUARD_INSTALLED__?: boolean;
};

(function (): void {
  'use strict';

  const lkWindow = window as LayarKosongWindow;

  const TWIKOO_ENV_ID = 'https://kom.dalam.web.id';
  const TWIKOO_CONTAINER_ID = '#response';
  const TWIKOO_CDN = 'https://cdn.jsdelivr.net/npm/twikoo@1.7.13/dist/twikoo.all.min.js';

  const container = document.querySelector<HTMLElement>(TWIKOO_CONTAINER_ID);
  if (!container) return;

  lkWindow.__LK_TWIKOO__ = lkWindow.__LK_TWIKOO__ || {
    loading: false,
    initializedContainers: new WeakSet<Element>()
  };

  const twikooState = lkWindow.__LK_TWIKOO__;

  /**
   * Kalau container ini sudah pernah di-init,
   * jangan render Twikoo lagi.
   */
  if (
    container.dataset.twikooState === 'loading' ||
    container.dataset.twikooState === 'ready' ||
    twikooState.initializedContainers.has(container)
  ) {
    return;
  }

  /**
   * Kalau markup Twikoo sudah ada di dalam container,
   * anggap sudah aktif.
   */
  if (
    container.querySelector('.tk-comments') ||
    container.querySelector('.tk-submit') ||
    container.querySelector('.tk-content')
  ) {
    container.dataset.twikooState = 'ready';
    twikooState.initializedContainers.add(container);
    return;
  }

  function isTurnstileScript(src: string): boolean {
    return /^https:\/\/challenges(?:\.fed)?\.cloudflare\.com\/turnstile\/v0\/.*api\.js/i.test(src);
  }

  function hasTurnstileScript(): boolean {
    return Array.from(document.scripts).some((script: HTMLScriptElement) => {
      return isTurnstileScript(script.src);
    });
  }

  /**
   * Pengaman tambahan:
   * kalau Twikoo mencoba menyuntik Turnstile api.js lagi
   * padahal window.turnstile sudah ada, blokir script kedua.
   */
  function installTurnstileDuplicateGuard(): void {
    if (lkWindow.__LK_TURNSTILE_GUARD_INSTALLED__) return;

    lkWindow.__LK_TURNSTILE_GUARD_INSTALLED__ = true;

    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    function shouldBlockDuplicateTurnstile(node: Node): boolean {
      if (!(node instanceof HTMLScriptElement)) return false;

      return Boolean(
        isTurnstileScript(node.src) &&
        lkWindow.turnstile &&
        hasTurnstileScript()
      );
    }

    Node.prototype.appendChild = function <T extends Node>(this: Node, node: T): T {
      if (shouldBlockDuplicateTurnstile(node)) {
        console.warn('[Layar Kosong] Duplicate Turnstile api.js diblokir.');

        window.setTimeout(() => {
          try {
            node.dispatchEvent(new Event('load'));
          } catch {
            // Abaikan error event tiruan.
          }
        }, 0);

        return node;
      }

      return originalAppendChild.call(this, node) as T;
    };

    Node.prototype.insertBefore = function <T extends Node>(
      this: Node,
      node: T,
      child: Node | null
    ): T {
      if (shouldBlockDuplicateTurnstile(node)) {
        console.warn('[Layar Kosong] Duplicate Turnstile api.js diblokir.');

        window.setTimeout(() => {
          try {
            node.dispatchEvent(new Event('load'));
          } catch {
            // Abaikan error event tiruan.
          }
        }, 0);

        return node;
      }

      return originalInsertBefore.call(this, node, child) as T;
    };
  }

  function loadScript(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (lkWindow.twikoo) {
        resolve();
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${url}"]`
      );

      if (existingScript) {
        let attempts = 0;
        const maxAttempts = 80;

        const timer = window.setInterval(() => {
          attempts += 1;

          if (lkWindow.twikoo) {
            window.clearInterval(timer);
            resolve();
            return;
          }

          if (attempts >= maxAttempts) {
            window.clearInterval(timer);
            reject(new Error('Twikoo script ada, tetapi window.twikoo tidak tersedia.'));
          }
        }, 100);

        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Gagal memuat Twikoo CDN: ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  async function initTwikoo(): Promise<void> {
    if (twikooState.loading) return;

    twikooState.loading = true;
    container.dataset.twikooState = 'loading';

    try {
      installTurnstileDuplicateGuard();

      await loadScript(TWIKOO_CDN);

      if (!lkWindow.twikoo) {
        throw new Error('window.twikoo tidak tersedia setelah CDN dimuat.');
      }

      await lkWindow.twikoo.init({
        envId: TWIKOO_ENV_ID,
        el: TWIKOO_CONTAINER_ID,
        lang: 'en'
      });

      container.dataset.twikooState = 'ready';
      twikooState.initializedContainers.add(container);

      console.log('Twikoo 1.7.13 berhasil dimuat di #response.');
    } catch (error) {
      container.dataset.twikooState = 'error';

      console.error('Gagal memuat Twikoo:', error);
    } finally {
      twikooState.loading = false;
    }
  }

  void initTwikoo();
})();
