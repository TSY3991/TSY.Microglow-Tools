/**
 * PriceRadar service worker：離線外殼（offline shell）。
 *
 * 策略刻意保守，避免快取造成「看到舊價格」或干擾 Vite dev HMR：
 * - /api/ 一律直接走網路、絕不快取（價格資料不能是舊的）
 * - 頁面與靜態資源：network-first，成功時順手更新快取；
 *   斷網時退回快取，讓已開過的頁面離線也能打開外殼
 * - 換版本時（CACHE_NAME 變更）舊快取整批清掉
 */
const CACHE_NAME = 'price-radar-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([self.registration.scope]))
      .catch(() => {}) // 首次安裝時網路失敗也不擋安裝
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return; // API 永遠即時，不進快取

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // 導航請求斷網且無快取時，退回外殼首頁
        if (event.request.mode === 'navigate') {
          const shell = await caches.match(self.registration.scope);
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
