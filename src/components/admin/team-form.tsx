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
import { createTeamMember, updateTeamMember, type TeamInput } from "@/lib/actions/team";
import type { TeamMember } from "@/lib/db/schema";

interface TeamFormProps {
  trigger: React.ReactNode;
  initial?: TeamMember;
}

export function TeamForm({ trigger, initial }: TeamFormProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [name, setName] = React.useState(initial?.name ?? "");
  const [role, setRole] = React.useState(initial?.role ?? "");
  const [experience, setExperience] = React.useState(initial?.experience ?? "");
  const [bio, setBio] = React.useState(initial?.bio ?? "");
  const [image, setImage] = React.useState(initial?.image ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);
  const [specialties, setSpecialties] = React.useState<string[]>(initial?.specialties ?? []);
  const [newSpec, setNewSpec] = React.useState("");

  function addSpec() {
    if (!newSpec.trim()) return;
    setSpecialties([...specialties, newSpec.trim()]);
    setNewSpec("");
  }
  function removeSpec(i: number) {
    setSpecialties(specialties.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: TeamInput = { name, role, bio, experience, image: image || null, specialties, active };
    try {
      if (initial) {
        await updateTeamMember(initial.id, payload);
        toast.success("Записът е обновен.");
      } else {
        await createTeamMember(payload);
        toast.success("Член на екипа е добавен.");
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
          <DialogTitle>{initial ? "Редакция на член" : "Нов член на екипа"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Име</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Опит</Label>
              <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="напр. 25+ години" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Роля / позиция</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="напр. Главен стилист" required />
          </div>
          <div className="space-y-2">
            <Label>Снимка (път или URL)</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/team/име.jpg" />
          </div>
          <div className="space-y-2">
            <Label>Био</Label>
            <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} required minLength={10} />
          </div>
          <div className="space-y-2">
            <Label>Специализации</Label>
            <div className="flex gap-2">
              <Input
                value={newSpec}
                onChange={(e) => setNewSpec(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpec();
                  }
                }}
                placeholder="напр. Балаяж"
              />
              <Button type="button" variant="outline" onClick={addSpec}>
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {specialties.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs">
                  {s}
                  <button type="button" onClick={() => removeSpec(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="active" className="cursor-pointer">Активен (показва се на сайта)</Label>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
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
