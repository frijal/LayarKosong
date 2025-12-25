/**
 * /ext/artikel.js
 * One-file Article Engine
 * Compatible with <script defer>
 */
(function () {
  'use strict';

  /* ==============================
   *     STATE
   *  ============================== */
  const state = {
    all: [],
 filtered: [],
 page: 1,
 perPage: 10
  };

  /* ==============================
   *     HELPERS
   *  ============================== */
  const $ = s => document.querySelector(s);
  const escape = s =>
  String(s || '').replace(/[&<>"']/g, m =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
  );

  /* ==============================
   *     DATA
   *  ============================== */
  function normalizeData(data) {
    state.all = [];

    for (const [category, items] of Object.entries(data)) {
      items.forEach(it => {
        const file = it[1] || '';
        state.all.push({
          category,
          title: it[0],
          link: `/artikel/${file.replace(/^\/+/, '')}`,
                       thumb: it[2],
                       date: new Date(it[3]),
                       summary: it[4] || ''
        });
      });
    }

    state.all.sort((a, b) => b.date - a.date);
    state.filtered = [...state.all];
  }

  /* ==============================
   *     RENDER GRID
   *  ============================== */
  function renderGrid(reset) {
    const grid = $('#newsGrid');
    const btn = $('#loadMoreBtn');
    if (!grid) return;

    if (reset) {
      grid.innerHTML = '';
      state.page = 1;
    }

    const start = (state.page - 1) * state.perPage;
    const slice = state.filtered.slice(start, start + state.perPage);

    if (!slice.length) {
      btn && (btn.style.display = 'none');
      return;
    }

    slice.forEach(a => {
      const el = document.createElement('article');
      el.className = 'card';
      el.innerHTML = `
      <img src="${a.thumb}" alt="${escape(a.title)}" loading="lazy">
      <h3><a href="${a.link}">${escape(a.title)}</a></h3>
      <p>${escape(a.summary)}</p>
      `;
      grid.appendChild(el);
    });

    btn && (btn.style.display =
    start + state.perPage >= state.filtered.length ? 'none' : 'inline-block');
  }

  /* ==============================
   *     SEARCH
   *  ============================== */
  function initSearch() {
    const input = $('#searchInput');
    if (!input) return;

    input.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      state.filtered = state.all.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q)
      );
      renderGrid(true);
    });
  }

  /* ==============================
   *     SIDEBAR (REKOMENDASI)
   *  ============================== */
  function renderSidebar() {
    const box = $('#sidebarList');
    if (!box) return;

    box.innerHTML = '';

    [...state.all]
    .sort(() => 0.5 - Math.random())
    .slice(0, 10)
    .forEach(a => {
      box.insertAdjacentHTML(
        'beforeend',
        `<div class="mini-card">
        <img src="${a.thumb}" loading="lazy">
        <a href="${a.link}">${escape(a.title)}</a>
        </div>`
      );
    });
  }

  /* expose untuk tombol "↻ Acak" */
  window.renderSidebar = renderSidebar;

  /* ==============================
   *     INIT
   *  ============================== */
  async function init() {
    try {
      const res = await fetch('/artikel.json');
      if (!res.ok) throw new Error(res.status);
      const json = await res.json();

      normalizeData(json);
      renderGrid(true);
      renderSidebar();
      initSearch();

      $('#loadMoreBtn')?.addEventListener('click', () => {
        state.page++;
        renderGrid(false);
      });

    } catch (e) {
      console.error('Artikel gagal dimuat:', e);
      $('#newsGrid')?.insertAdjacentHTML(
        'beforeend',
        '<p style="grid-column:1/-1;color:red">Gagal memuat artikel.</p>'
      );
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();
