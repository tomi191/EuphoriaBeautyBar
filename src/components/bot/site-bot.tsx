"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Site bot widget (без LLM) — плаващ асистент върху публичните страници.
 * Диалогът е stateless към сървъра: всяко съобщение → POST /api/bot.
 * Виж docs/superpowers/specs/2026-08-30-site-bot-design.md.
 */

interface BotLink {
  label: string;
  href: string;
}

interface BotMessage {
  role: "user" | "bot";
  text: string;
  links?: BotLink[];
  suggestions?: string[];
}

const GREETING: BotMessage = {
  role: "bot",
  text: "Здравей! Мога да ти покажа услуги и цени, да те насоча към записване на час или да отговоря за работно време, адрес и свободни места под наем.",
  suggestions: ["Цени и услуги", "Запази час", "Работно време", "Къде се намирате?", "Работа при вас"],
};

const ERROR_MESSAGE: BotMessage = {
  role: "bot",
  text: "Нещо се обърка при мен. Обади се или пиши във Viber — там отговаря човек от салона.",
  links: [
    { label: "+359 898 66 33 15", href: "tel:+359898663315" },
    { label: "Пиши във Viber", href: "viber://chat?number=%2B359898663315" },
  ],
};

export function SiteBot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Като SiteHeader: ботът е само за публичните страници.
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: message }]);
    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const reply = (await res.json()) as { text: string; links?: BotLink[]; suggestions?: string[] };
      setMessages((m) => [...m, { role: "bot", text: reply.text, links: reply.links, suggestions: reply.suggestions }]);
    } catch {
      setMessages((m) => [...m, ERROR_MESSAGE]);
    } finally {
      setBusy(false);
    }
  }

  const lastSuggestions = messages.at(-1)?.suggestions ?? [];

  return (
    <>
      {/* Плаващ бутон */}
      <button
        type="button"
        aria-label={open ? "Затвори асистента" : "Отвори асистента"}
        onClick={() => setOpen((o) => !o)}
        // Mobile: над MobileCallBar (h-14 фиксирана лента); desktop: долу вдясно.
        className="fixed bottom-[4.5rem] right-4 z-50 grid size-14 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 hover:bg-primary lg:bottom-5 lg:right-5"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {/* Панел */}
      <div
        className={cn(
          "fixed bottom-[8.75rem] right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl transition-all lg:bottom-[5.75rem] lg:right-5",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        role="dialog"
        aria-label="Онлайн асистент на Euphoria"
      >
        <div className="flex items-center justify-between bg-foreground px-4 py-3 text-background">
          <div>
            <p className="font-display text-base leading-tight">Euphoria · асистент</p>
            <p className="text-xs text-background/70">Отговаря веднага, от живия ценоразпис</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex max-h-[50svh] min-h-64 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "bg-foreground text-background" : "bg-secondary text-foreground",
                )}
              >
                {m.text}
              </div>
              {m.links && m.links.length > 0 && (
                <div className="flex max-w-[85%] flex-wrap gap-2">
                  {m.links.map((l) =>
                    l.href.startsWith("/") ? (
                      <Link
                        key={l.href + l.label}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-foreground/25 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        key={l.href + l.label}
                        href={l.href}
                        className="rounded-full border border-foreground/25 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {l.label}
                      </a>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="text-xs text-muted-foreground">пише…</p>}
        </div>

        {lastSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/40 px-4 py-2.5">
            {lastSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full bg-mint px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-mint/70"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex items-center gap-2 border-t border-border/40 px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши услуга или въпрос…"
            aria-label="Съобщение до асистента"
            className="h-10 flex-1 rounded-full border border-border/60 bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            aria-label="Изпрати"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition-colors hover:bg-primary disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </>
  );
}
