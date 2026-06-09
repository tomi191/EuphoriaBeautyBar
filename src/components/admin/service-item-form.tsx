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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createServiceItem, updateServiceItem, type ServiceItemInput } from "@/lib/actions/service-items";
import type { ServiceItem } from "@/lib/db/schema";

interface Props {
  trigger: React.ReactNode;
  categoryId: string;
  groupTitles: string[];
  initial?: ServiceItem;
}

export function ServiceItemForm({ trigger, categoryId, groupTitles, initial }: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [groupTitle, setGroupTitle] = React.useState(initial?.groupTitle ?? groupTitles[0] ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [price, setPrice] = React.useState(initial?.price ?? 0);
  const [priceMax, setPriceMax] = React.useState<number | "">(initial?.priceMax ?? "");
  const [priceFrom, setPriceFrom] = React.useState(initial?.priceFrom ?? false);
  const [currency, setCurrency] = React.useState(initial?.currency ?? "лв");
  const [duration, setDuration] = React.useState(initial?.duration ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [durationMin, setDurationMin] = React.useState<number>(initial?.durationMin ?? 30);
  const [bufferMin, setBufferMin] = React.useState<number>(initial?.bufferMin ?? 10);
  const [bookableOnline, setBookableOnline] = React.useState<boolean>(initial?.bookableOnline ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: ServiceItemInput = {
      categoryId,
      groupTitle,
      name,
      price,
      priceMax: priceMax === "" ? null : Number(priceMax),
      priceFrom,
      currency,
      duration: duration || null,
      description: description || null,
      durationMin,
      bufferMin,
      bookableOnline,
    };
    try {
      if (initial) {
        await updateServiceItem(initial.id, payload);
        toast.success("Услугата е обновена.");
      } else {
        await createServiceItem(payload);
        toast.success("Услугата е добавена.");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" description="Форма за услуга — група, име, цена, продължителност и параметри за онлайн записване.">
        <DialogHeader>
          <DialogTitle>{initial ? "Редакция на услуга" : "Нова услуга"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Група</Label>
              <Input list="groups" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} required />
              <datalist id="groups">
                {groupTitles.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Валута</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="лв">лв</SelectItem>
                  <SelectItem value="€">€</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Име на услугата</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Цена</Label>
              <Input type="number" step="0.5" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Макс. цена (опц.)</Label>
              <Input type="number" step="0.5" value={priceMax} onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="flex items-end justify-between rounded-lg border border-border p-3">
              <Label htmlFor="from" className="text-xs">&quot;от&quot; цена</Label>
              <Switch id="from" checked={priceFrom} onCheckedChange={setPriceFrom} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Продължителност (опц.)</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="напр. 90 мин" />
          </div>
          <div className="space-y-2">
            <Label>Описание (опц.)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">За онлайн записване</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Времетраене (мин)</Label>
                <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label>Буфер / почистване (мин)</Label>
                <Input type="number" min={0} step={5} value={bufferMin} onChange={(e) => setBufferMin(Number(e.target.value))} required />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="bookable" className="cursor-pointer text-sm">Може да се записва онлайн</Label>
              <Switch id="bookable" checked={bookableOnline} onCheckedChange={setBookableOnline} />
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
