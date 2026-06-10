// Service worker за работническото приложение (PWA) — installability + push известия + offline fallback.
const STAFF_CACHE = "staff-pages-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Почисти стари версии на staff кеша.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("staff-pages-") && k !== STAFF_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Offline last-known-good: network-first САМО за навигации към /staff страници.
// API заявки и POST-ове не се кешират.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/staff")) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        // Кеширай само успешен HTML отговор (последния добър за този URL).
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
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/pwa-192.png",
      badge: "/icons/pwa-192.png",
      data: { url: data.url || "/staff" },
    }),
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
