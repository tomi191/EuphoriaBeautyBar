"use client";

import * as React from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Бутони за споделяне на статия: Facebook, Viber, X/Twitter + „Копирай линк".
 *
 * Линкът се сглобява клиентски от window.location, за да работи на всеки
 * домейн/среда без да подаваме абсолютния URL от сървъра. Native share
 * intents (отварят се в нов таб); copy ползва Clipboard API с toast.
 */
export function ShareButtons({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const [url, setUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shares = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
          <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
        </svg>
      ),
    },
    {
      label: "Viber",
      href: `viber://forward?text=${encodedTitle}%20${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
          <path d="M11.4 0C9.5.03 5.3.34 2.96 2.49 1.22 4.22.61 6.78.54 9.95.48 13.12.4 19.05 6.12 20.66h.01l-.01 2.46s-.04.99.62 1.2c.78.24 1.1-.32 2.28-1.7.65-.75 1.07-1.32 1.07-1.32 3.94.33 6.97-.43 7.32-.55.79-.26 5.26-.83 5.99-6.77.75-6.12-.37-10-2.39-11.75l-.01-.01C19.95 1.4 16.55.31 13.41.18c0 0-.66-.03-1.42-.03-.2 0-.4 0-.59.01ZM11.96 1.75c.64 0 1.21.02 1.21.02 2.65.11 5.5 1.02 6.55 1.93 1.71 1.45 2.65 4.94 2.02 10.05-.61 4.96-4.23 5.37-4.9 5.59-.29.09-2.96.74-6.3.52 0 0-2.49 3-3.27 3.78-.12.13-.27.18-.36.16-.14-.04-.18-.2-.17-.44l.02-4.09c-4.84-1.34-4.56-6.39-4.51-9.04.06-2.65.55-4.79 2.01-6.24C8.04 1.98 11.6 1.75 11.96 1.75Zm.13 2.07a.4.4 0 0 0-.4.4.4.4 0 0 0 .4.4c1.88 0 3.43.61 4.66 1.79 1.22 1.18 1.83 2.78 1.85 4.82a.4.4 0 0 0 .4.4h.01a.4.4 0 0 0 .4-.41c-.02-2.21-.7-4.05-2.07-5.38-1.39-1.34-3.15-2.02-5.25-2.02h-.01Zm-3.9.97c-.2-.05-.4-.01-.57.08h-.01c-.4.23-.76.53-1.05.89-.24.31-.37.61-.4.91-.02.17 0 .34.06.51l.02.01c.17.46.55 1.25 1.41 2.59.5.78 1.05 1.48 1.66 2.12.45.48.92.92 1.42 1.32l.03.03.03.02.04.03.03.02c.65.5 1.35.95 2.09 1.34 1.34.86 2.14 1.24 2.6 1.41h.01c.17.06.34.08.51.06.3-.03.6-.16.91-.4.36-.29.66-.65.89-1.05v-.01c.09-.17.13-.37.08-.57-.1-.41-.55-.74-1.04-1.07-.35-.24-.74-.45-1.13-.6-.31-.12-.6-.06-.83.13-.15.12-.27.27-.42.42-.13.14-.36.18-.56.1-.85-.36-1.6-.92-2.18-1.65a4.8 4.8 0 0 1-.66-1.04c-.08-.2-.04-.43.1-.56.15-.15.3-.27.42-.42.19-.23.25-.52.13-.83a6.05 6.05 0 0 0-.6-1.13c-.33-.49-.66-.94-1.07-1.04Zm4.05.85a.4.4 0 0 0-.4.39.4.4 0 0 0 .38.41c1.36.07 2.04.77 2.12 2.18a.4.4 0 0 0 .4.38h.02a.4.4 0 0 0 .38-.42c-.1-1.83-1.09-2.85-2.88-2.94h-.02Zm.13 1.62a.4.4 0 0 0-.06.8c.46.07.65.27.71.74a.4.4 0 0 0 .4.35h.05a.4.4 0 0 0 .35-.45c-.1-.82-.55-1.3-1.39-1.43a.4.4 0 0 0-.06-.01Z" />
        </svg>
      ),
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3L17.61 20.65Z" />
        </svg>
      ),
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Линкът е копиран.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Копирането не успя. Копирай линка ръчно.");
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <Share2 className="size-3.5" /> Сподели
      </span>

      {shares.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Сподели в ${s.label}`}
          title={`Сподели в ${s.label}`}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition-colors hover:border-primary/40 hover:bg-secondary hover:text-primary"
        >
          {s.icon}
        </a>
      ))}

      <button
        type="button"
        onClick={copyLink}
        aria-label="Копирай линк"
        title="Копирай линк"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition-colors hover:border-primary/40 hover:bg-secondary hover:text-primary"
      >
        {copied ? (
          <Check className="size-4 text-primary" />
        ) : (
          <Link2 className="size-4" />
        )}
      </button>
    </div>
  );
}
