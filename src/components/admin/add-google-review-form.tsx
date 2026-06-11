"use client";

import * as React from "react";
import { Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addGoogleReview } from "@/lib/actions/google-reviews";

/** Ръчно въвеждане на Google отзив (безплатен път без Places API). */
export function AddGoogleReviewForm() {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [rating, setRating] = React.useState(5);
  const [authorName, setAuthorName] = React.useState("");
  const [text, setText] = React.useState("");
  const [publishedAt, setPublishedAt] = React.useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addGoogleReview({ authorName, rating, text, publishedAt });
      if (result.ok) {
        toast.success("Отзивът е добавен и се вижда на сайта.");
        setOpen(false);
        setAuthorName("");
        setText("");
        setRating(5);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Добави ръчно
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" description="Копирай отзив от Google профила на салона: име, звезди, текст и дата.">
          <DialogHeader>
            <DialogTitle>Добави Google отзив</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Копирай отзива от Google профила на салона. Показва се в секция „Отзиви“ на началната страница.
            </p>
            <div className="space-y-2">
              <Label htmlFor="gr-name">Име на клиента</Label>
              <Input id="gr-name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} required minLength={2} placeholder="както е в Google" />
            </div>
            <div className="space-y-2">
              <Label>Оценка</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} звезди`}
                    className="p-1"
                  >
                    <Star className={`size-5 ${n <= rating ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">{rating} от 5</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gr-text">Текст на отзива</Label>
              <Textarea id="gr-text" value={text} onChange={(e) => setText(e.target.value)} required minLength={10} rows={4} placeholder="точният текст от Google" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gr-date">Дата на публикуване</Label>
              <Input id="gr-date" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" disabled={pending} className="bg-foreground text-background hover:bg-foreground/90">
                {pending ? <><Loader2 className="size-4 animate-spin" /> Добавяне</> : "Добави отзива"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
