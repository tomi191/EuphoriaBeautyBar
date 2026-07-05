"use client";

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

/**
 * Branded fallback при грешка в рендера на страница (напр. Supabase pooler hiccup по
 * време на записване) — вместо суровия „Application error" екран на Next. Дава на
 * клиента опит пак + телефон за връзка, за да не изгуби записа.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/50">Възникна грешка</p>
      <h1 className="mt-4 font-display text-3xl font-medium md:text-4xl">Нещо се обърка.</h1>
      <p className="mt-3 text-foreground/70">
        Опитай отново след момент. Ако проблемът продължи, обади ни се и ще запазим часа ти по телефона.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-primary"
        >
          Опитай пак
        </button>
        <a
          href={`tel:${siteConfig.contact.phone}`}
          className="rounded-full border border-foreground/20 px-6 py-2.5 text-sm font-medium transition-colors hover:border-foreground/40"
        >
          Обади се: {siteConfig.contact.phoneFormatted}
        </a>
      </div>
      <Link href="/" className="mt-6 text-sm text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground">
        Към началната страница
      </Link>
    </main>
  );
}
