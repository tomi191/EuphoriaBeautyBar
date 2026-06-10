"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatServicePrice } from "@/lib/booking/price";
import { toggleMyService, updateMyService, createMyService, deleteMyService } from "@/lib/actions/resource-services";

export interface MyServiceOpt {
  id: string;
  name: string;
  category: string;
  groupTitle: string;
  offered: boolean;
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
  durationMin: number;
  bufferMin: number;
  /** Може да се изтрие от каталога (никой друг изпълнител не я предлага). */
  deletable: boolean;
}

export interface MyCategoryOpt {
  slug: string;
  title: string;
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) if (!seen.has(v)) { seen.add(v); out.push(v); }
  return out;
}

export function MyServices({ services, categories }: { services: MyServiceOpt[]; categories: MyCategoryOpt[] }) {
  const router = useRouter();
  const [list, setList] = React.useState(services);
  React.useEffect(() => setList(services), [services]);

  const cats = React.useMemo(() => uniq(list.map((s) => s.category)), [list]);
  const [activeCat, setActiveCat] = React.useState(cats[0] ?? "");
  const [editing, setEditing] = React.useState<MyServiceOpt | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const shown = list.filter((s) => s.category === activeCat);
  const allGroups = React.useMemo(() => uniq(list.map((s) => s.groupTitle)), [list]);

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

  async function onDelete(s: MyServiceOpt) {
    setDeletingId(s.id);
    try {
      const res = await deleteMyService(s.id);
      if (res.ok) {
        setList((prev) => prev.filter((x) => x.id !== s.id));
        toast.success("Услугата е изтрита от каталога.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Грешка.");
      }
    } catch {
      toast.error("Грешка при изтриване.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <>
      {cats.length > 1 && (
        <div className="mb-4 flex gap-1.5 rounded-2xl bg-cream p-1.5">
          {cats.map((c) => (
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
            className={"flex items-center gap-2 rounded-2xl border border-border bg-background p-3.5 " + (s.offered ? "" : "opacity-55")}
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

            {s.deletable && (
              confirmDeleteId === s.id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDelete(s)}
                    disabled={deletingId === s.id}
                    className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    {deletingId === s.id ? <Loader2 className="size-3 animate-spin" /> : "Изтрий"}
                  </button>
                  {deletingId !== s.id && (
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-[11px] font-medium text-muted-foreground">
                      Не
                    </button>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(s.id)}
                  aria-label={`Изтрий ${s.name} от каталога`}
                  title="Изтрий от каталога"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              )
            )}

            {pendingId === s.id ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Switch checked={s.offered} onCheckedChange={() => onToggle(s)} />
            )}
          </div>
        ))}
        {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Няма услуги в тази категория.</p>}
      </div>

      <Button
        onClick={() => setAdding(true)}
        variant="outline"
        className="mt-4 h-12 w-full rounded-full border-dashed"
      >
        <Plus className="size-4" /> Добави нова услуга
      </Button>

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

      {adding && (
        <AddSheet
          groups={allGroups}
          categories={categories}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            router.refresh();
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
              <option value="€">€</option>
              <option value="лв">лв</option>
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

function AddSheet({
  groups,
  categories,
  onClose,
  onAdded,
}: {
  groups: string[];
  categories: MyCategoryOpt[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = React.useState("");
  const [groupTitle, setGroupTitle] = React.useState(groups[0] ?? "");
  const [categorySlug, setCategorySlug] = React.useState(categories[0]?.slug ?? "");
  const [price, setPrice] = React.useState<number | "">("");
  const [priceFrom, setPriceFrom] = React.useState(false);
  const [durationMin, setDurationMin] = React.useState(30);
  const [saving, setSaving] = React.useState(false);

  const isNewGroup = groupTitle.trim().length > 0 && !groups.includes(groupTitle.trim());

  async function save() {
    if (!name.trim() || !groupTitle.trim() || price === "" || Number(price) <= 0) {
      toast.error("Попълни име, група и цена.");
      return;
    }
    setSaving(true);
    try {
      const res = await createMyService({
        name: name.trim(),
        groupTitle: groupTitle.trim(),
        categorySlug: isNewGroup ? categorySlug : null,
        price: Number(price),
        priceFrom,
        durationMin,
        bufferMin: 10,
      });
      if (res.ok) {
        toast.success("Услугата е добавена — вече е в ценоразписа и в записването.");
        onAdded();
      } else {
        toast.error(res.error ?? "Грешка.");
      }
    } catch {
      toast.error("Грешка при добавяне.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button aria-label="Затвори" className="fixed inset-0 z-40 bg-foreground/35" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border-t border-border bg-background p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-lg font-bold">Нова услуга</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Влиза в общия ценоразпис на сайта и в онлайн записването при теб.
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Име на услугата</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Терапия с топли ножици" className="h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label>Група (подкатегория)</Label>
            <Input list="staff-groups" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="избери или напиши нова" className="h-12 text-base" />
            <datalist id="staff-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          {isNewGroup && categories.length > 1 && (
            <div className="space-y-1.5">
              <Label>Категория за новата група</Label>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3 text-base">
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Цена (€)</Label>
              <Input type="number" step="0.5" min={0.5} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className="h-12 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label>Продължителност (мин)</Label>
              <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="h-12 text-base" />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm font-medium">&quot;от&quot; цена (ориентировъчна)</span>
            <Switch checked={priceFrom} onCheckedChange={setPriceFrom} />
          </label>
        </div>
        <Button onClick={save} disabled={saving} className="mt-5 h-12 w-full rounded-full bg-foreground text-base text-background hover:bg-primary">
          {saving ? <><Loader2 className="size-4 animate-spin" /> Добавяне</> : "Добави услугата"}
        </Button>
      </div>
    </>
  );
}
