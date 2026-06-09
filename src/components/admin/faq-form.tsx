"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createFaq, updateFaq, type FaqInput } from "@/lib/actions/faq";
import type { FaqItem } from "@/lib/db/schema";

export function FaqForm({ trigger, initial }: { trigger: React.ReactNode; initial?: FaqItem }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [question, setQuestion] = React.useState(initial?.question ?? "");
  const [answer, setAnswer] = React.useState(initial?.answer ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);
  const [sortOrder, setSortOrder] = React.useState(initial?.sortOrder ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: FaqInput = { question, answer, active, sortOrder };
    try {
      if (initial) {
        await updateFaq(initial.id, payload);
        toast.success("Въпросът е обновен.");
      } else {
        await createFaq(payload);
        toast.success("Въпросът е добавен.");
      }
      setOpen(false);
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Редакция на въпрос" : "Нов въпрос"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Въпрос</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={3} />
          </div>
          <div className="space-y-2">
            <Label>Отговор</Label>
            <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} required minLength={10} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Подредба</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-end justify-between rounded-lg border border-border p-3">
              <Label htmlFor="active" className="cursor-pointer">Активен</Label>
              <Switch id="active" checked={active} onCheckedChange={setActive} />
            </div>
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
