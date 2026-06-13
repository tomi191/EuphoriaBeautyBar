// Service worker за работническото приложение (PWA) — installability + push известия + offline.
// v2: добавен asset кеш (JS/CSS/икони) — без него standalone app е бяла страница офлайн след
// cold start (HTML-ът се сервира, но Next.js chunk-овете гърмят). Тук:
//  - навигации /staff → network-first с кеширан fallback (както преди);
//  - статични asset-и (/_next/static, /icons, /images) → stale-while-revalidate (кешират се
//    при първо online зареждане → офлайн boot работи след това; content-hashed са, безопасно).
const STAFF_CACHE = "staff-pages-v2";
const ASSET_CACHE = "staff-assets-v2";
const PRECACHE = ["/icons/pwa-192.png", "/icons/pwa-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      await cache.addAll(PRECACHE).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Почисти стари версии на кешовете.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => (k.startsWith("staff-pages-") || k.startsWith("staff-assets-")) && k !== STAFF_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/images/"))
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) Статични asset-и — stale-while-revalidate (важи и извън /staff scope, защото
  //    chunk-овете се споделят; кешираме само GET към static пътищата).
  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
    return;
  }

  // 2) Навигации към /staff — network-first, кеширан fallback (last-known-good).
  if (req.mode !== "navigate") return;
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/staff")) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(STAFF_CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cache = await caches.open(STAFF_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const fallback = await cache.match("/staff");
        if (fallback) return fallback;
        return new Response(
          '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Офлайн</title></head><body style="margin:0;min-height:100dvh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f6f3ee;color:#2b2b2b"><p style="padding:24px;text-align:center">Няма връзка с интернет.<br>Опитай отново, когато си онлайн.</p></body></html>',
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Euphoria";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icons/pwa-192.png",
        badge: "/icons/pwa-192.png",
        // vibrate + tag: heads-up банер + бръмчене (както работещия vrachka). Без тях Android
        // може да вкара известието „тихо" само в лентата → изглежда сякаш нищо не идва.
        vibrate: [200, 100, 200],
        tag: data.tag || "euphoria-staff",
        renotify: true,
        requireInteraction: true,
        data: { url: data.url || "/staff" },
      }),
      // ВРЕМЕННА диагностика: уведоми сървъра, че push-ът е стигнал до устройството.
      fetch("/api/push-ack?ts=" + Date.now() + "&data=" + (event.data ? "1" : "0")).catch(function () {}),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/staff";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes("/staff"));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
