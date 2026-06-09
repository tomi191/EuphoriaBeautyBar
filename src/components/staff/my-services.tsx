"use client";

import * as React from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatServicePrice } from "@/lib/booking/price";
import { toggleMyService, updateMyService } from "@/lib/actions/resource-services";

export interface MyServiceOpt {
  id: string;
  name: string;
  category: string;
  offered: boolean;
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
  durationMin: number;
  bufferMin: number;
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) if (!seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

export function MyServices({ services }: { services: MyServiceOpt[] }) {
  const [list, setList] = React.useState(services);
  const categories = React.useMemo(() => uniq(list.map((s) => s.category)), [list]);
  const [activeCat, setActiveCat] = React.useState(categories[0] ?? "");
  const [editing, setEditing] = React.useState<MyServiceOpt | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const shown = list.filter((s) => s.category === activeCat);

  async function onToggle(s: MyServiceOpt) {
    setPendingId(s.id);
    setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, offered: !x.offered } : x)));
    try {
      await toggleMyService(s.id);
    } catch {
      setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, offered: s.offered } : x)));
      toast.error("Грешка.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      {categories.length > 1 && (
        <div className="mb-4 flex gap-1.5 rounded-2xl bg-cream p-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCat(c)}
              className={
                "flex-1 rounded-xl py-2 text-sm font-semibold transition-colors " +
                (c === activeCat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {shown.map((s) => (
          <div
            key={s.id}
            className={"flex items-center gap-3 rounded-2xl border border-border bg-background p-3.5 " + (s.offered ? "" : "opacity-55")}
          >
            <button
              type="button"
              disabled={!s.offered}
              onClick={() => setEditing(s)}
              className="min-w-0 flex-1 text-left disabled:cursor-default"
            >
              <p className="font-semibold leading-tight">{s.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {s.offered ? (
                  <span className="inline-flex items-center gap-1.5">
                    {s.durationMin} мин · <span className="font-bold text-primary">{formatServicePrice(s)}</span>
                    <Pencil className="size-3 text-muted-foreground/70" />
                  </span>
                ) : (
                  "не предлагам"
                )}
              </p>
            </button>
            {pendingId === s.id ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch checked={s.offered} onCheckedChange={() => onToggle(s)} />
            )}
          </div>
        ))}
        {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Няма услуги в тази категория.</p>}
      </div>

      {editing && (
        <EditSheet
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function EditSheet({
  service,
  onClose,
  onSaved,
}: {
  service: MyServiceOpt;
  onClose: () => void;
  onSaved: (s: MyServiceOpt) => void;
}) {
  const [price, setPrice] = React.useState(service.price);
  const [priceMax, setPriceMax] = React.useState<number | "">(service.priceMax ?? "");
  const [priceFrom, setPriceFrom] = React.useState(service.priceFrom);
  const [currency, setCurrency] = React.useState(service.currency);
  const [durationMin, setDurationMin] = React.useState(service.durationMin);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateMyService(service.id, {
        price,
        priceMax: priceMax === "" ? null : Number(priceMax),
        priceFrom,
        currency,
        durationMin,
        bufferMin: service.bufferMin,
      });
      toast.success("Запазено.");
      onSaved({ ...service, price, priceMax: priceMax === "" ? null : Number(priceMax), priceFrom, currency, durationMin });
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button aria-label="Затвори" className="fixed inset-0 z-40 bg-foreground/35" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border-t border-border bg-background p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-lg font-bold">{service.name}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Цена</Label>
            <Input type="number" step="0.5" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label>Продължителност (мин)</Label>
            <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="h-12 text-base" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Макс. цена (опц.)</Label>
            <Input type="number" step="0.5" value={priceMax} onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} className="h-12 text-base" placeholder="—" />
          </div>
          <div className="space-y-1.5">
            <Label>Валута</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base">
              <option value="лв">лв</option>
              <option value="€">€</option>
            </select>
          </div>
        </div>
        <label className="mt-3 flex items-center justify-between rounded-xl border border-border p-3">
          <span className="text-sm font-medium">&quot;от&quot; цена (ориентировъчна)</span>
          <Switch checked={priceFrom} onCheckedChange={setPriceFrom} />
        </label>
        <Button onClick={save} disabled={saving} className="mt-5 h-12 w-full rounded-full bg-foreground text-base text-background hover:bg-primary">
          {saving ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази"}
        </Button>
      </div>
    </>
  );
}
