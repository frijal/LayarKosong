/**
 * Twikoo Loader for Layar Kosong
 * Versi: 1.7.13-turnstile-borrow
 * Target: #response
 *
 * Prinsip:
 * - Twikoo tetap dimuat normal.
 * - Kalau Turnstile sudah ada, Twikoo "meminjam" window.turnstile.
 * - Duplicate Turnstile api.js dari Twikoo diblokir.
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
  render?: (...args: unknown[]) => unknown;
  reset?: (...args: unknown[]) => unknown;
  remove?: (...args: unknown[]) => unknown;
  ready?: (callback: () => void) => void;
}

interface LayarKosongTwikooState {
  loading: boolean;
  initializedContainers: WeakSet<Element>;
}

type LayarKosongWindow = Window & {
  twikoo?: TwikooApi;
  turnstile?: TurnstileApi;
  __LK_TWIKOO__?: LayarKosongTwikooState;
  __LK_TURNSTILE_SINGLETON_GUARD__?: boolean;
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

  if (
    container.dataset.twikooState === 'loading' ||
    container.dataset.twikooState === 'ready' ||
    twikooState.initializedContainers.has(container)
  ) {
    return;
  }

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
    return /^https:\/\/challenges(?:\.fed)?\.cloudflare\.com\/turnstile\/v0(?:\/.*)?\/api\.js/i.test(src);
  }

  function getExistingTurnstileScript(): HTMLScriptElement | null {
    return Array.from(document.scripts).find((script) => {
      return isTurnstileScript(script.src);
    }) || null;
  }

  function dispatchSyntheticLoad(node: Node): void {
    window.setTimeout(() => {
      try {
        node.dispatchEvent(new Event('load'));
      } catch {
        // Abaikan error event tiruan.
      }
    }, 0);
  }

  function waitExistingTurnstileThenLoad(node: Node): void {
    if (lkWindow.turnstile) {
      dispatchSyntheticLoad(node);
      return;
    }

    const existingScript = getExistingTurnstileScript();

    if (!existingScript) {
      dispatchSyntheticLoad(node);
      return;
    }

    existingScript.addEventListener(
      'load',
      () => {
        dispatchSyntheticLoad(node);
      },
      { once: true }
    );

    existingScript.addEventListener(
      'error',
      () => {
        dispatchSyntheticLoad(node);
      },
      { once: true }
    );

    /**
     * Fallback supaya Twikoo tidak menggantung kalau script lama
     * sudah selesai tetapi event load-nya tidak bisa ditangkap.
     */
    window.setTimeout(() => {
      dispatchSyntheticLoad(node);
    }, 3000);
  }

  /**
   * Ini bagian utama:
   * kalau Turnstile sudah ada / sedang dimuat,
   * script Turnstile kedua dari Twikoo tidak boleh masuk.
   */
  function installTurnstileSingletonGuard(): void {
    if (lkWindow.__LK_TURNSTILE_SINGLETON_GUARD__) return;
    lkWindow.__LK_TURNSTILE_SINGLETON_GUARD__ = true;

    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    function shouldBorrowExistingTurnstile(node: Node): boolean {
      if (!(node instanceof HTMLScriptElement)) return false;
      if (!isTurnstileScript(node.src)) return false;

      /**
       * Blokir hanya kalau sudah ada Turnstile global
       * atau sudah ada script Turnstile lain yang sedang/selesai dimuat.
       */
      return Boolean(lkWindow.turnstile || getExistingTurnstileScript());
    }

    Node.prototype.appendChild = function <T extends Node>(this: Node, node: T): T {
      if (shouldBorrowExistingTurnstile(node)) {
        waitExistingTurnstileThenLoad(node);
        return node;
      }

      return originalAppendChild.call(this, node) as T;
    };

    Node.prototype.insertBefore = function <T extends Node>(
      this: Node,
      node: T,
      child: Node | null
    ): T {
      if (shouldBorrowExistingTurnstile(node)) {
        waitExistingTurnstileThenLoad(node);
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
      /**
       * Guard harus dipasang sebelum Twikoo dimuat,
       * karena Twikoo bisa menyuntik Turnstile setelah init.
       */
      installTurnstileSingletonGuard();

      await loadScript(TWIKOO_CDN);

      if (!lkWindow.twikoo) {
        throw new Error('window.twikoo tidak tersedia setelah CDN dimuat.');
      }

      await lkWindow.twikoo.init({
        envId: TWIKOO_ENV_ID,
        el: TWIKOO_CONTAINER_ID,
        lang: 'id'
      });

      container.dataset.twikooState = 'ready';
      twikooState.initializedContainers.add(container);

    } catch (error) {
      container.dataset.twikooState = 'error';
      console.error('Gagal memuat Twikoo:', error);
    } finally {
      twikooState.loading = false;
    }
  }

  void initTwikoo();
})();
