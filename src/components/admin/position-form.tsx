"use client";

import * as React from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createPosition, updatePosition, type PositionInput } from "@/lib/actions/positions";
import type { RentalPosition } from "@/lib/db/schema";

interface PositionFormProps {
  trigger: React.ReactNode;
  initial?: RentalPosition;
}

export function PositionForm({ trigger, initial }: PositionFormProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [type, setType] = React.useState(initial?.type ?? "Под наем · по график");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);
  const [skills, setSkills] = React.useState<string[]>(initial?.skills ?? []);
  const [newSkill, setNewSkill] = React.useState("");

  function addSkill() {
    if (!newSkill.trim()) return;
    setSkills([...skills, newSkill.trim()]);
    setNewSkill("");
  }
  function removeSkill(i: number) {
    setSkills(skills.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: PositionInput = { title, type, description, skills, active };
    try {
      if (initial) {
        await updatePosition(initial.id, payload);
        toast.success("Позицията е обновена.");
      } else {
        await createPosition(payload);
        toast.success("Позицията е добавена.");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Редакция на позиция" : "Нова позиция под наем"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Позиция</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Фризьор" required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Тип / график</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Под наем · по график" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={5} />
          </div>
          <div className="space-y-2">
            <Label>Умения / тагове</Label>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="напр. Балаяж"
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs">
                  {s}
                  <button type="button" onClick={() => removeSkill(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="pos-active" className="cursor-pointer">Активна (показва се на /karieri)</Label>
            <Switch id="pos-active" checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отказ
            </Button>
            <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
