"use client";

import * as React from "react";

/**
 * Регистрира service worker-а на ВСИЧКИ /staff страници (вкл. login).
 * Chrome изисква активен SW в scope-а, за да предложи PWA инсталация —
 * без това нелогнат потребител на /staff/login не получава install prompt.
 */
export function SwRegister() {
  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
