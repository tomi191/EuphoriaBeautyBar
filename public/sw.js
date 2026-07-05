// Service worker за работническото приложение (PWA) — installability + push известия + offline.
// v2: добавен asset кеш (JS/CSS/икони) — без него standalone app е бяла страница офлайн след
// cold start (HTML-ът се сервира, но Next.js chunk-овете гърмят). Тук:
//  - навигации /staff → network-first с кеширан fallback (както преди);
//  - статични asset-и (/_next/static, /icons, /images) → stale-while-revalidate (кешират се
//    при първо online зареждане → офлайн boot работи след това; content-hashed са, безопасно).
const STAFF_CACHE = "staff-pages-v2";
const ASSET_CACHE = "staff-assets-v2";
// НЕ прекешираме иконите — иконите на известията трябва да минават директно през мрежата,
// не през този SW (иначе push handler-ът ги дърпа във фонов контекст и при cache miss връща
// невалиден отговор → Android не рисува известието).
const PRECACHE = [];

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
      // .catch около cleanup-а: ако едно изтриване гръмне (quota/lock), claim() пак трябва да
      // се изпълни — иначе новият SW активира, но не поема старите клиенти (split-brain).
      await Promise.all(
        keys
          .filter((k) => (k.startsWith("staff-pages-") || k.startsWith("staff-assets-")) && k !== STAFF_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k)),
      ).catch((e) => console.error("[sw] cache cleanup провал:", e));
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  // ВАЖНО: /icons/ НЕ се прихваща — иконите на известията се fetch-ват директно от мрежата
  // (както в работещия vrachka). Прихващането им чрез този handler в push (фонов) контекст
  // връщаше невалиден/undefined отговор и Android отказваше да покаже известието.
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/"))
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
        // Без .catch(() => cached): при cache miss + мрежова грешка не връщаме undefined
        // (което чупеше respondWith), а оставяме мрежовата грешка да се прояви нормално.
        const network = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        });
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
        // НЕ кешираме следван redirect — requireStaff() при изтекла сесия връща 307
        // към /staff/login, чийто 200 иначе се записва под ключ /staff и офлайн
        // показва login на „логнат" потребител.
        if (res.ok && !res.redirected) {
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
  // badge ТРЯБВА да е монохромен бял-на-прозрачно (/icons/badge-96.png) — Android го
  // alpha-маскира за status-bar иконата. Цветен/плътен badge → невалидна маска → някои
  // Android/Chrome WebAPK билдове изобщо НЕ показват известието (създава се, getNotifications
  // го връща, но е невидимо). requireInteraction/renotify махнати (Android ги игнорира).
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/pwa-192.png",
      badge: "/icons/badge-96.png",
      lang: "bg",
      dir: "ltr",
      vibrate: [200, 100, 200],
      tag: data.tag || "euphoria-staff",
      data: { url: data.url || "/staff" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/staff";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const target = new URL(url, self.location.origin).href;
        const existing = clients.find((c) => c.url.includes("/staff"));
        if (existing) {
          // Навигирай съществуващия прозорец към целевия url, не само focus — иначе
          // кликът върху известие отваря /staff, но не конкретния изглед (график/дата).
          if (existing.url !== target && typeof existing.navigate === "function") {
            return existing
              .navigate(target)
              .then((c) => (c || existing).focus())
              .catch(() => existing.focus());
          }
          return existing.focus();
        }
        // openWindow може да върне null (някои Android WebAPK билдове отказват отваряне във
        // фон) — не сривай тихо, фокусирай съществуващ клиент ако има.
        return self.clients.openWindow(url).then((client) => {
          if (client) return client.focus();
          console.warn("[sw] openWindow върна null за", url);
        });
      })
      .catch((e) => console.warn("[sw] notificationclick грешка:", e)),
  );
});

// Позволи на страницата да форсира активиране на нова версия (иначе нов SW засяда в
// „waiting" и устройството върти стар код → поправките не достигат). Виж SwRegister.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  // При logout страницата праща това → трием кеша с server-rendered /staff HTML,
  // който съдържа клиентски PII (имена/телефони/бележки). GDPR: да не остава on-device.
  if (event.data && event.data.type === "CLEAR_STAFF_CACHE") {
    event.waitUntil(caches.delete(STAFF_CACHE));
  }
});
