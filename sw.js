// 離線快取：第一次開啟後，所有頁面與照片都存在手機上，山區沒網路也能看。
// 內容有更新時，把 VERSION 改掉即可。
const VERSION = 'cd2026-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icon.svg',
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/img/bianlian.jpg',
  'assets/img/chengdu-skyline.jpg',
  'assets/img/chunxi.jpg',
  'assets/img/hotpot.jpg',
  'assets/img/jinli.jpg',
  'assets/img/jiuzhai-fiveflower.jpg',
  'assets/img/jiuzhai-panorama.jpg',
  'assets/img/jiuzhai-pearl.jpg',
  'assets/img/kuanzhai.jpg',
  'assets/img/panda.jpg',
  'assets/img/shuangqiao.jpg',
  'assets/img/siguniang-town.jpg',
  'assets/img/siguniang.jpg',
  'assets/img/taikoo.jpg',
  'assets/img/wuhou.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 先用網路（拿到最新版），失敗再用快取
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
