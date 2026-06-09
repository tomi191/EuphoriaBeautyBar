"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createResource, updateResource, type ResourceInput } from "@/lib/actions/resources";
import type { Resource } from "@/lib/db/schema";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const KINDS: Array<{ value: "hair" | "nails" | "cosmetics"; label: string }> = [
  { value: "hair", label: "Коса" },
  { value: "nails", label: "Нокти" },
  { value: "cosmetics", label: "Лице / Козметика" },
];

export function ResourceForm({ trigger, initial }: { trigger: React.ReactNode; initial?: Resource }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [name, setName] = React.useState(initial?.name ?? "");
  const [kind, setKind] = React.useState<"hair" | "nails" | "cosmetics">((initial?.kind as "hair" | "nails" | "cosmetics") ?? "hair");
  const [color, setColor] = React.useState(initial?.color ?? "#8FC7A6");
  const [image, setImage] = React.useState(initial?.image ?? "");
  const [bio, setBio] = React.useState(initial?.bio ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: ResourceInput = { name, kind, color: color || null, image: image.trim() || null, bio: bio.trim() || null, active };
    try {
      if (initial) {
        await updateResource(initial.id, payload);
        toast.success("Изпълнителят е обновен.");
      } else {
        await createResource(payload);
        toast.success("Изпълнителят е добавен.");
      }
      setOpen(false);
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" description="Форма за данните на изпълнителя — име, тип услуги, цвят, снимка и кратко описание.">
          <DialogHeader>
            <DialogTitle>{initial ? "Редакция на изпълнител" : "Нов изпълнител"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Име</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="напр. Снежана" />
            </div>
            <div className="space-y-2">
              <Label>Тип услуги</Label>
              <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as "hair" | "nails" | "cosmetics")}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Цвят в календара</Label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-md border border-input bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Снимка</Label>
              <div className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                  {image.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.trim()} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Лого
                    </span>
                  )}
                </div>
                <Input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/images/team/име.jpg или URL"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Празно поле = ще се ползва логото на салона.</p>
            </div>
            <div className="space-y-2">
              <Label>Кратко описание (за клиента при избор)</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="напр. Снежана — собственик, специалист по цвят и подстригване."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="res-active" className="cursor-pointer">Активен (приема записвания)</Label>
              <Switch id="res-active" checked={active} onCheckedChange={setActive} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Запазване
                  </>
                ) : (
                  "Запази"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
