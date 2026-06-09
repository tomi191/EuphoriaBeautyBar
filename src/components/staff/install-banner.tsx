"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [evt, setEvt] = React.useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt || hidden) return null;

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
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
