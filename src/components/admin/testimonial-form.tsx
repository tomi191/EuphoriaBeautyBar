"use client";

import * as React from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createTestimonial, updateTestimonial, type TestimonialInput } from "@/lib/actions/testimonials";
import type { Testimonial } from "@/lib/db/schema";

export function TestimonialForm({ trigger, initial }: { trigger: React.ReactNode; initial?: Testimonial }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [name, setName] = React.useState(initial?.name ?? "");
  const [service, setService] = React.useState(initial?.service ?? "");
  const [quote, setQuote] = React.useState(initial?.quote ?? "");
  const [initials, setInitials] = React.useState(initial?.initials ?? "");
  const [rating, setRating] = React.useState(initial?.rating ?? 5);
  const [approved, setApproved] = React.useState(initial?.approved ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: TestimonialInput = { name, service, rating, quote, initials, approved };
    try {
      if (initial) {
        await updateTestimonial(initial.id, payload);
        toast.success("Отзивът е обновен.");
      } else {
        await createTestimonial(payload);
        toast.success("Отзивът е добавен.");
      }
      setOpen(false);
    } catch (err) {
      toast.error("Грешка при запазване.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Редакция на отзив" : "Нов отзив"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Клиент (име)</Label>
              <Input
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!initial) setInitials(v.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2));
                }}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Инициали (за аватара)</Label>
              <Input value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Услуга</Label>
            <Input value={service} onChange={(e) => setService(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Цитат</Label>
            <Textarea rows={4} value={quote} onChange={(e) => setQuote(e.target.value)} required minLength={10} />
          </div>
          <div className="space-y-2">
            <Label>Рейтинг</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                  aria-label={`${n} звезди`}
                >
                  <Star className={"size-6 " + (n <= rating ? "fill-foreground text-foreground" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="approved" className="cursor-pointer">Одобрен (видим на сайта)</Label>
            <Switch id="approved" checked={approved} onCheckedChange={setApproved} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отказ</Button>
            <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
