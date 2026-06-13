"use client";

import * as React from "react";

/**
 * Регистрира service worker-а на ВСИЧКИ /staff страници (вкл. login).
 * Chrome изисква активен SW в scope-а, за да предложи PWA инсталация —
 * без това нелогнат потребител на /staff/login не получава install prompt.
 */
export function SwRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // При смяна на контролиращия SW → презареди веднъж, за да поеме новата версия веднага.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Форсирай нова версия да поеме веднага — иначе нов SW засяда в „waiting" и
        // устройството върти стар код (push поправките не достигат). Активиране става чрез
        // SKIP_WAITING съобщение към waiting worker-а + controllerchange reload по-горе.
        const promote = () => {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        };
        // Закачи updatefound ПРЕДИ update() — иначе бързо инсталиращ се worker излъчва събитието
        // преди listener-ът да е вързан и promote() го пропуска (нов SW засяда в „waiting").
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (nw) nw.addEventListener("statechange", () => { if (nw.state === "installed") promote(); });
        });
        promote(); // ако вече има waiting от предишно посещение
        // Логвай провал (404 на /sw.js при лош deploy, timeout) — иначе зомби SW върти стар код тихо.
        reg.update().catch((err) => console.error("[sw] update провал:", err));
      })
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);
  return null;
}
