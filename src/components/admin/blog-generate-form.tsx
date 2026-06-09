"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, ListChecks, Loader2, Plus, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["Грижа за коса", "Терапии", "Маникюр", "Wellness"] as const;
const AUTO = "auto";

interface GeneratedPost {
  slug: string;
  title: string;
  category: string;
  cover: string | null;
  readingMinutes: number;
  blocks: number;
}

interface TopicSuggestion {
  topic: string;
  keywords: string[];
  rationale: string;
  searchIntent: string;
}

export function BlogGenerateForm({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [topic, setTopic] = React.useState("");
  const [category, setCategory] = React.useState<string>(AUTO);
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [newKeyword, setNewKeyword] = React.useState("");
  const [result, setResult] = React.useState<GeneratedPost | null>(null);

  // Suggest-keywords / suggest-topics
  const [suggestingKeywords, setSuggestingKeywords] = React.useState(false);
  const [suggestingTopics, setSuggestingTopics] = React.useState(false);
  const [topicSuggestions, setTopicSuggestions] = React.useState<TopicSuggestion[]>([]);

  /** Авто ключови думи: вика suggest-keywords с темата → попълва chips. */
  async function suggestKeywords() {
    const t = topic.trim();
    if (t.length < 3) {
      toast.error("Въведи първо тема (поне 3 символа).");
      return;
    }
    setSuggestingKeywords(true);
    try {
      const res = await fetch("/api/admin/blog/suggest-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Грешка при предложение.");
      const suggested: string[] = Array.isArray(data.keywords) ? data.keywords : [];
      if (suggested.length === 0) {
        toast.error("AI не върна ключови думи.");
        return;
      }
      // Merge без дубликати (case-insensitive).
      setKeywords((prev) => {
        const seen = new Set(prev.map((k) => k.toLowerCase()));
        const merged = [...prev];
        for (const k of suggested) {
          if (!seen.has(k.toLowerCase())) {
            merged.push(k);
            seen.add(k.toLowerCase());
          }
        }
        return merged;
      });
      toast.success(`Добавени ${suggested.length} ключови думи.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Грешка при предложение.");
    } finally {
      setSuggestingKeywords(false);
    }
  }

  /** Предложи теми: вика suggest-topics → показва списък с предложения. */
  async function suggestTopics() {
    setSuggestingTopics(true);
    try {
      const res = await fetch("/api/admin/blog/suggest-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category === AUTO ? undefined : category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Грешка при предложение.");
      const list: TopicSuggestion[] = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (list.length === 0) {
        toast.error("AI не върна теми.");
        return;
      }
      setTopicSuggestions(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Грешка при предложение.");
    } finally {
      setSuggestingTopics(false);
    }
  }

  /** Клик върху предложена тема: попълва темата + ключовите думи. */
  function applySuggestion(s: TopicSuggestion) {
    setTopic(s.topic);
    if (s.keywords.length > 0) {
      setKeywords(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const k of s.keywords) {
          if (k && !seen.has(k.toLowerCase())) {
            out.push(k);
            seen.add(k.toLowerCase());
          }
        }
        return out;
      });
    }
    setTopicSuggestions([]);
    toast.success("Темата е попълнена.");
  }

  function addKeyword() {
    const v = newKeyword.trim();
    if (!v) return;
    setKeywords((prev) => [...prev, v]);
    setNewKeyword("");
  }
  function removeKeyword(i: number) {
    setKeywords((prev) => prev.filter((_, idx) => idx !== i));
  }

  function reset() {
    setTopic("");
    setCategory(AUTO);
    setKeywords([]);
    setNewKeyword("");
    setResult(null);
    setTopicSuggestions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topic.trim().length < 4) {
      toast.error("Въведи по-конкретна тема.");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          keywords: keywords.length ? keywords : undefined,
          category: category === AUTO ? undefined : category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Грешка при генерация.");
      }
      setResult(data.post as GeneratedPost);
      toast.success("Статията е генерирана като чернова.");
      // Обновява листинга в admin таблицата
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Грешка при генерация.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Генерирай статия с AI</DialogTitle>
          <DialogDescription>
            Въведи тема и по избор ключови думи. Статията се записва като чернова и можеш да я
            прегледаш преди публикуване.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5">
              <p className="text-xs uppercase tracking-wider text-primary">{result.category}</p>
              <h3 className="mt-1 font-display text-lg">{result.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {result.readingMinutes} мин · {result.blocks} блока ·{" "}
                {result.cover ? "с корица" : "без корица"} · статус: чернова
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Нова статия
              </Button>
              <Button
                type="button"
                onClick={() => window.open(`/blog/${result.slug}`, "_blank")}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Виж черновата
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Тема</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={suggestTopics}
                  disabled={suggestingTopics}
                >
                  {suggestingTopics ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Lightbulb className="size-3.5" />
                  )}
                  Предложи теми
                </Button>
              </div>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="напр. Как да поддържаме балаяж между посещенията"
                required
                minLength={4}
              />

              {topicSuggestions.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ListChecks className="size-3.5" /> Кликни тема, за да я попълниш
                  </p>
                  <ul className="space-y-1.5">
                    {topicSuggestions.map((s, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className="w-full rounded-lg border border-transparent bg-card/60 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-card"
                        >
                          <span className="block text-sm font-medium text-foreground">
                            {s.topic}
                          </span>
                          {s.rationale && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {s.rationale}
                            </span>
                          )}
                          {s.keywords.length > 0 && (
                            <span className="mt-1 block truncate text-[11px] text-primary/80">
                              {s.keywords.join(" · ")}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO}>Автоматично (AI избира)</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Ключови думи (по избор)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={suggestKeywords}
                  disabled={suggestingKeywords}
                >
                  {suggestingKeywords ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  Авто ключови думи
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="напр. кератинова терапия"
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  <Plus className="size-4" />
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {keywords.map((k, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs"
                    >
                      {k}
                      <button
                        type="button"
                        onClick={() => removeKeyword(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Ако оставиш ключовите думи празни, AI ги извежда сам от темата. Генерацията отнема
              около 20-60 секунди. Корицата изисква настроени KIE и Supabase Storage; ако липсват,
              статията се записва без изображение.
            </p>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Генериране…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Генерирай
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
