"use client";

import * as React from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Инсталирано ли е вече като PWA (standalone режим)? */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy флаг
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Банер за инсталиране на приложението:
 * - Android/Chrome: ловим beforeinstallprompt → бутон „Добави" пуска native промпта.
 * - iOS/Safari: НЯМА автоматичен prompt — показваме инструкция (Share → Добави към начален екран).
 * Скрит, ако app-ът вече е инсталиран (standalone).
 */
export function InstallBanner() {
  const [evt, setEvt] = React.useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = React.useState(false);
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => {
    if (isStandalone()) return; // вече е инсталирано
    if (isIOS()) {
      setIos(true);
      setHidden(false);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden) return null;

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setHidden(true);
  }

  if (ios) {
    return (
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-3.5 text-primary-foreground">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/25">
            <Download className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Инсталирай приложението</p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed opacity-95">
              Натисни <Share className="inline size-3.5" aria-label="Сподели" /> <strong>Сподели</strong>, после
              <SquarePlus className="inline size-3.5" aria-label="Добави" /> <strong>„Добави към начален екран"</strong>
            </p>
          </div>
          <button onClick={() => setHidden(true)} aria-label="Скрий" className="shrink-0 p-1 text-white/70 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-3.5 text-primary-foreground">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/25">
        <Download className="size-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Инсталирай приложението</p>
        <p className="text-xs opacity-90">За бърз достъп от началния екран</p>
      </div>
      <button onClick={install} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-primary">
        Добави
      </button>
      <button onClick={() => setHidden(true)} aria-label="Скрий" className="shrink-0 p-1 text-white/70 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
