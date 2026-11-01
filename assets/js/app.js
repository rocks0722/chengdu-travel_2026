(function () {
  'use strict';

  const TRIP_START = '2026-11-02';
  const TRIP_END = '2026-11-11';
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  // 以「成都時間」(UTC+8，與台灣相同) 取得今天日期
  function todayISO() {
    const d = new Date(Date.now() + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }

  function daysBetween(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  }

  // ===== 今日提示 =====
  function markToday() {
    const today = todayISO();
    const banner = document.getElementById('todayBanner');
    const card = document.querySelector('.day[data-date="' + today + '"]');

    if (card) {
      card.classList.add('is-today');
      const h3 = card.querySelector('h3');
      h3.insertAdjacentHTML('beforeend', '<span class="today-chip">今天</span>');
      const link = document.querySelector('.overview a[href="#' + card.id + '"]');
      if (link) link.classList.add('is-today');

      const no = card.querySelector('.day-no').textContent;
      const d = new Date(today + 'T00:00:00');
      banner.href = '#' + card.id;
      banner.innerHTML = '<span class="dot"></span>今天是 ' + no + '・' +
        (d.getMonth() + 1) + '/' + d.getDate() + '（' + WEEKDAYS[d.getDay()] + '）→ 看今日行程';
      banner.hidden = false;
      return;
    }

    const left = daysBetween(today, TRIP_START);
    if (left > 0) {
      banner.textContent = '✈️ 距離出發還有 ' + left + ' 天';
      banner.hidden = false;
    } else if (today > TRIP_END) {
      banner.textContent = '🐼 旅程結束，下次再來成都！';
      banner.hidden = false;
    }
  }

  // ===== 清單勾選（存在 localStorage） =====
  const STORE_KEY = 'cd2026-checks';

  function loadChecks() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveChecks(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 私密模式等情況忽略 */ }
  }

  function initChecklist() {
    const boxes = document.querySelectorAll('.checklist input[data-key]');
    const state = loadChecks();
    boxes.forEach(function (box) {
      box.dataset.default = box.checked ? '1' : '0';
      if (box.dataset.key in state) box.checked = state[box.dataset.key];
      box.addEventListener('change', function () {
        const s = loadChecks();
        s[box.dataset.key] = box.checked;
        saveChecks(s);
      });
    });
    document.getElementById('resetChecks').addEventListener('click', function () {
      if (!confirm('要把所有勾選恢復成預設嗎？')) return;
      saveChecks({});
      boxes.forEach(function (box) { box.checked = box.dataset.default === '1'; });
    });
  }

  // ===== 導覽列標示目前區塊 =====
  function initNav() {
    const links = Array.from(document.querySelectorAll('.tabs a'));
    const sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { if (s) io.observe(s); });
  }

  // ===== 詳細行程彈窗 =====
  function initDialogs() {
    document.querySelectorAll('[data-open]').forEach(function (btn) {
      const dlg = document.getElementById(btn.dataset.open);
      if (!dlg || typeof dlg.showModal !== 'function') return;
      btn.addEventListener('click', function () {
        dlg.showModal();
        dlg.querySelector('.sheet-body').scrollTop = 0;
      });
    });
    document.querySelectorAll('dialog.sheet').forEach(function (dlg) {
      dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
      // 點背景（彈窗外）關閉
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) dlg.close();
      });
    });
  }

  // ===== 每日照片輪播（左右滑動） =====
  function initCarousels() {
    document.querySelectorAll('.carousel').forEach(function (c) {
      const track = c.querySelector('.slides');
      const slides = track.querySelectorAll('.slide');
      if (slides.length < 2) return;

      const count = document.createElement('span');
      count.className = 'carousel-count';
      const dots = document.createElement('div');
      dots.className = 'carousel-dots';
      slides.forEach(function (s, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', '第 ' + (i + 1) + ' 張');
        b.addEventListener('click', function () { go(i); });
        dots.appendChild(b);
      });
      const prev = document.createElement('button');
      prev.type = 'button'; prev.className = 'carousel-nav prev'; prev.textContent = '‹'; prev.setAttribute('aria-label', '上一張');
      const next = document.createElement('button');
      next.type = 'button'; next.className = 'carousel-nav next'; next.textContent = '›'; next.setAttribute('aria-label', '下一張');
      c.append(count, dots, prev, next);

      function current() { return Math.round(track.scrollLeft / track.clientWidth); }
      function go(i) {
        i = (i + slides.length) % slides.length;
        track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
      }
      function update() {
        const i = current();
        count.textContent = (i + 1) + ' / ' + slides.length;
        dots.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('on', j === i); });
      }
      prev.addEventListener('click', function () { go(current() - 1); });
      next.addEventListener('click', function () { go(current() + 1); });
      track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
      c.goTo = go;
      update();
    });

    // 行程裡的景點名稱：點一下切換到那張照片
    document.querySelectorAll('.spot-link').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const c = btn.closest('.day').querySelector('.carousel');
        if (!c || !c.goTo) return;
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        c.goTo(Number(btn.dataset.slide));
      });
    });
  }

  // ===== 照片放大 =====
  function initLightbox() {
    const box = document.getElementById('lightbox');
    if (!box || typeof box.showModal !== 'function') return;
    const big = box.querySelector('img');
    const cap = box.querySelector('.lightbox-cap');
    document.querySelectorAll('.slide img, .spot img, img.zoomable').forEach(function (img) {
      img.addEventListener('click', function () {
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        const label = img.parentElement.querySelector('.slide-cap');
        cap.textContent = label ? label.textContent : img.alt;
        box.showModal();
      });
    });
    box.addEventListener('click', function () { box.close(); });
  }

  markToday();
  initChecklist();
  initNav();
  initDialogs();
  initCarousels();
  initLightbox();

  // ===== 離線快取（山區沒訊號也能看） =====
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
