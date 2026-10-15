"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelWithHint } from "@/components/ui/field-hint";
import { FIELD_HINTS } from "@/lib/data/field-hints";
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
  const [price, setPrice] = React.useState<number | "">(initial?.price ?? "");
  const [priceMax, setPriceMax] = React.useState<number | "">(initial?.priceMax ?? "");
  const [priceFrom, setPriceFrom] = React.useState(initial?.priceFrom ?? false);
  const [currency, setCurrency] = React.useState(initial?.currency ?? "€");
  const [duration, setDuration] = React.useState(initial?.duration ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [durationMin, setDurationMin] = React.useState<number>(initial?.durationMin ?? 30);
  const [bufferMin, setBufferMin] = React.useState<number>(initial?.bufferMin ?? 10);
  const [activeMin, setActiveMin] = React.useState<number>(initial?.activeMin ?? 0);
  const [processingMin, setProcessingMin] = React.useState<number>(initial?.processingMin ?? 0);
  const [bookableOnline, setBookableOnline] = React.useState<boolean>(initial?.bookableOnline ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (price === "") {
      toast.error("Въведи цена.");
      setSubmitting(false);
      return;
    }
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
      activeMin,
      processingMin,
      bookableOnline,
    };
    try {
      const res = initial ? await updateServiceItem(initial.id, payload) : await createServiceItem(payload);
      if (!res.ok) {
        // Валидационна причина от сървъра (напр. престой 5 мин) — не общо „Грешка".
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Услугата е обновена." : "Услугата е добавена.");
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
              <LabelWithHint htmlFor="si-group" label="Група" hint={FIELD_HINTS.group} />
              <Input id="si-group" list="groups" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} required />
              <datalist id="groups">
                {groupTitles.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <LabelWithHint htmlFor="si-currency" label="Валута" hint={FIELD_HINTS.currency} />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="si-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="€">€</SelectItem>
                  {/* „лв" остава избираемо за легаси данни, но priceEur snapshot-ът вече
                      конвертира лв→€ (toEur) — левова цена няма да надуе оборота. */}
                  <SelectItem value="лв">лв</SelectItem>
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
              <LabelWithHint htmlFor="si-price" label="Цена" hint={FIELD_HINTS.priceCatalog} />
              <Input id="si-price" type="number" step="0.5" value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <LabelWithHint htmlFor="si-pricemax" label="Макс. цена (опц.)" hint={FIELD_HINTS.priceMax} />
              <Input id="si-pricemax" type="number" step="0.5" value={priceMax} onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="flex items-end justify-between rounded-lg border border-border p-3">
              <LabelWithHint htmlFor="from" label={<>&quot;от&quot; цена</>} hint={FIELD_HINTS.priceFrom} className="text-xs" />
              <Switch id="from" checked={priceFrom} onCheckedChange={setPriceFrom} />
            </div>
          </div>
          <div className="space-y-2">
            <LabelWithHint htmlFor="si-durtext" label="Продължителност (опц.)" hint={FIELD_HINTS.durationText} />
            <Input id="si-durtext" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="напр. 90 мин" />
          </div>
          <div className="space-y-2">
            <Label>Описание (опц.)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">За онлайн записване</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <LabelWithHint htmlFor="si-duration" label="Времетраене (мин)" hint={FIELD_HINTS.durationMin} />
                <Input id="si-duration" type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <LabelWithHint htmlFor="si-buffer" label="Буфер / почистване (мин)" hint={FIELD_HINTS.bufferMin} />
                <Input id="si-buffer" type="number" min={0} step={5} value={bufferMin} onChange={(e) => setBufferMin(Number(e.target.value))} required />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <LabelWithHint htmlFor="si-active" label="Активни минути" hint={FIELD_HINTS.activeMin} />
                <Input id="si-active" type="number" min={0} step={5} value={activeMin} onChange={(e) => setActiveMin(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <LabelWithHint htmlFor="si-processing" label="Минути престой" hint={FIELD_HINTS.processingMin} />
                <Input id="si-processing" type="number" min={0} step={5} value={processingMin} onChange={(e) => setProcessingMin(Number(e.target.value))} />
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Нужни са за онлайн записването и за паралелните часове.
            </p>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border p-3">
              <LabelWithHint htmlFor="bookable" label="Показва се на сайта и в онлайн записването" hint={FIELD_HINTS.catalogVisible} className="cursor-pointer text-sm" />
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
