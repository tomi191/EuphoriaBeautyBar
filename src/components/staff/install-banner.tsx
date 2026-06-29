"use client";

import * as React from "react";
import { Download, Share, SquarePlus, MoreVertical, X } from "lucide-react";

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

type Mode = "hidden" | "ios" | "android-prompt" | "android-manual";

/**
 * Банер за инсталиране — ВИНАГИ предлага път, не разчита само на авто-промпта:
 * - Android/Chrome с beforeinstallprompt → бутон „Добави" (native промпт).
 * - Android/Chrome БЕЗ промпт (Chrome спира авто-промпта напр. след деинсталация)
 *   → ръчна инструкция „меню ⋮ → Добави към началния екран".
 * - iOS/Safari → инструкция Share → Добави.
 * Скрит само ако app-ът е инсталиран (standalone) или потребителят го скрие.
 */
export function InstallBanner() {
  const [evt, setEvt] = React.useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = React.useState<Mode>("hidden");

  React.useEffect(() => {
    if (isStandalone()) return;
    if (isIOS()) {
      setMode("ios");
      return;
    }
    // Android/desktop: показвай ръчната инструкция по подразбиране; надгради до
    // native промпт, ако Chrome го предложи.
    setMode("android-manual");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallPromptEvent);
      setMode("android-prompt");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "hidden") return null;

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setMode("hidden");
  }

  const wrap = "mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-3.5 text-primary-foreground";
  const closeBtn = (
    <button onClick={() => setMode("hidden")} aria-label="Скрий" className="shrink-0 p-1 text-white/70 hover:text-white">
      <X className="size-4" />
    </button>
  );

  if (mode === "ios") {
    return (
      <div className={wrap}>
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
          {closeBtn}
        </div>
      </div>
    );
  }

  if (mode === "android-prompt") {
    return (
      <div className={wrap + " flex items-center gap-3"}>
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
        {closeBtn}
      </div>
    );
  }

  // android-manual: Chrome не предлага авто-промпт (напр. след деинсталация)
  return (
    <div className={wrap}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/25">
          <Download className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Инсталирай приложението</p>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed opacity-95">
            Отвори менюто <MoreVertical className="inline size-3.5" aria-label="меню" /> на Chrome, после
            <strong>„Добави към началния екран"</strong>
          </p>
        </div>
        {closeBtn}
      </div>
    </div>
  );
}
