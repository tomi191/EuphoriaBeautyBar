"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { formatServicePrice } from "@/lib/booking/price";
import { parseDecimalInput } from "@/lib/decimal";
import { toggleMyService, updateMyService, createMyService, deleteMyService, toggleMyServiceOnline } from "@/lib/actions/resource-services";

export interface MyServiceOpt {
  id: string;
  name: string;
  category: string;
  groupTitle: string;
  offered: boolean;
  /** Приема ли онлайн часове (иначе клиентът вижда телефон). */
  onlineBookable: boolean;
  price: number;
  priceMax: number | null;
  priceFrom: boolean;
  currency: string;
  durationMin: number;
  bufferMin: number;
  activeMin: number;
  processingMin: number;
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

export function MyServices({ services, categories, phone }: { services: MyServiceOpt[]; categories: MyCategoryOpt[]; phone: string | null }) {
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
  const [query, setQuery] = React.useState("");

  const q = query.trim().toLowerCase();
  const shown = list.filter((s) => s.category === activeCat && (q === "" || s.name.toLowerCase().includes(q)));
  const allGroups = React.useMemo(() => uniq(list.map((s) => s.groupTitle)), [list]);

  async function onToggle(s: MyServiceOpt) {
    setPendingId(s.id);
    setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, offered: !x.offered } : x)));
    try {
      const res = await toggleMyService(s.id);
      if (!res.ok) {
        // Сървърът отказа (напр. услугата не съществува) → върни оптимистичното състояние.
        setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, offered: s.offered } : x)));
        toast.error("Услугата не можа да се обнови. Опресни и опитай пак.");
      }
    } catch {
      setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, offered: s.offered } : x)));
      toast.error("Грешка.");
    } finally {
      setPendingId(null);
    }
  }

  async function onToggleOnline(s: MyServiceOpt) {
    // Спиране на онлайн запис изисква телефон за връзка (за да не остане клиентът без опция).
    if (s.onlineBookable && !phone?.trim()) {
      toast.error("Първо въведи телефон за връзка в профила си.");
      return;
    }
    setPendingId(s.id);
    setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, onlineBookable: !x.onlineBookable } : x)));
    try {
      const res = await toggleMyServiceOnline(s.id);
      if (!res.ok) {
        setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, onlineBookable: s.onlineBookable } : x)));
        toast.error(res.error ?? "Грешка.");
      }
    } catch {
      setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, onlineBookable: s.onlineBookable } : x)));
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
                "flex-1 rounded-xl py-2 text-sm font-semibold transition-all active:scale-[0.98] " +
                (c === activeCat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Търси услуга…"
          aria-label="Търси услуга"
          className="h-11 rounded-xl pl-9 pr-10"
        />
        {query !== "" && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Изчисти търсенето"
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {shown.map((s) => (
          <div
            key={s.id}
            className={"rounded-xl border border-border bg-background px-3 py-2 " + (s.offered ? "" : "opacity-55")}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!s.offered}
                onClick={() => setEditing(s)}
                className="min-w-0 flex-1 text-left transition-transform active:scale-[0.98] disabled:cursor-default"
              >
                <p className="text-sm font-semibold leading-tight">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
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
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )
              )}

              <span className="flex shrink-0 flex-col items-center gap-0.5">
                {pendingId === s.id ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch checked={s.offered} onCheckedChange={() => onToggle(s)} aria-label="Предлагам" />
                )}
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Предлагам</span>
              </span>
            </div>

            {s.offered && (
              <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 border-t border-border/50 pt-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {s.onlineBookable ? "Онлайн запис включен" : "Онлайн изключен · клиентът вижда телефона ти"}
                </span>
                <Switch checked={s.onlineBookable} onCheckedChange={() => onToggleOnline(s)} aria-label="Онлайн запис" />
              </label>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {q !== "" ? "Няма услуга по това търсене." : "Няма услуги в тази категория."}
          </p>
        )}
      </div>

      <Button
        onClick={() => setAdding(true)}
        variant="outline"
        className="mt-3 h-11 w-full rounded-full border-dashed active:scale-[0.98]"
      >
        <Plus className="size-4" /> Добави нова услуга
      </Button>

      <Sheet open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-lg gap-0 overflow-y-auto rounded-t-3xl p-4 pb-6">
          {editing && (
            <EditSheet
              key={editing.id}
              service={editing}
              onSaved={(updated) => {
                setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                setEditing(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={adding} onOpenChange={(o) => { if (!o) setAdding(false); }}>
        <SheetContent side="bottom" className="mx-auto max-h-[92vh] max-w-lg gap-0 overflow-y-auto rounded-t-3xl p-4 pb-6">
          {adding && (
            <AddSheet
              groups={allGroups}
              categories={categories}
              onAdded={() => {
                setAdding(false);
                router.refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function EditSheet({
  service,
  onSaved,
}: {
  service: MyServiceOpt;
  onSaved: (s: MyServiceOpt) => void;
}) {
  // Цените са текст + parseDecimalInput — виж коментара в AddSheet (запетаята
  // от БГ клавиатура се губи в type=number поле).
  const [price, setPrice] = React.useState(String(service.price));
  const [priceMax, setPriceMax] = React.useState(service.priceMax === null ? "" : String(service.priceMax));
  const [priceFrom, setPriceFrom] = React.useState(service.priceFrom);
  const [currency] = React.useState(service.currency); // € — салонът е едновалутен
  const [durationMin, setDurationMin] = React.useState(service.durationMin);
  const [activeMin, setActiveMin] = React.useState(service.activeMin);
  const [processingMin, setProcessingMin] = React.useState(service.processingMin);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ price?: string; priceMax?: string }>({});

  async function save() {
    const parsedPrice = parseDecimalInput(price);
    const parsedMax = priceMax.trim() === "" ? null : parseDecimalInput(priceMax);
    const nextErrors = {
      price: parsedPrice !== null && parsedPrice > 0 ? undefined : "Въведи цена — само число, напр. 25 или 25,50.",
      priceMax:
        priceMax.trim() !== "" && parsedMax === null ? "Макс. цена — само число, или остави празно." : undefined,
    };
    if (nextErrors.price || nextErrors.priceMax) {
      setErrors(nextErrors);
      toast.error("Провери отбелязаните полета.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res = await updateMyService(service.id, {
        price: parsedPrice!,
        priceMax: parsedMax,
        priceFrom,
        currency,
        durationMin,
        bufferMin: service.bufferMin,
        activeMin,
        processingMin,
      });
      if (!res.ok) {
        // Сървърна валидация (напр. активно+престой > блок) → покажи причината, не „Запазено".
        toast.error(res.error ?? "Неуспешно запазване.");
        setSaving(false);
        return;
      }
      toast.success("Запазено.");
      onSaved({ ...service, price: parsedPrice!, priceMax: parsedMax, priceFrom, currency, durationMin, activeMin, processingMin });
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
      <SheetTitle className="text-base font-bold">{service.name}</SheetTitle>
      <SheetDescription className="sr-only">Редакция на цена, продължителност и времена за паралелни часове.</SheetDescription>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label>Цена (€)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (errors.price) setErrors((p) => ({ ...p, price: undefined }));
              }}
              placeholder="напр. 25 или 25,50"
              aria-invalid={!!errors.price}
              className={"h-11 text-base" + (errors.price ? " border-destructive" : "")}
            />
            {errors.price && <p role="alert" className="text-xs text-destructive">{errors.price}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Продължителност (мин)</Label>
            <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="h-11 text-base" />
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label>Макс. цена (опц.)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={priceMax}
              onChange={(e) => {
                setPriceMax(e.target.value);
                if (errors.priceMax) setErrors((p) => ({ ...p, priceMax: undefined }));
              }}
              placeholder="—"
              aria-invalid={!!errors.priceMax}
              className={"h-11 text-base" + (errors.priceMax ? " border-destructive" : "")}
            />
            {errors.priceMax && <p role="alert" className="text-xs text-destructive">{errors.priceMax}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Валута</Label>
            {/* Салонът работи в €; левова цена би влязла числово като € в оборота. */}
            <div className="grid h-11 w-full place-items-center rounded-md border border-input bg-muted/40 px-3 text-base text-muted-foreground">€</div>
          </div>
        </div>
        <label className="mt-3 flex items-center justify-between rounded-xl border border-border p-3">
          <span className="text-sm font-medium">&quot;от&quot; цена (ориентировъчна)</span>
          <Switch checked={priceFrom} onCheckedChange={setPriceFrom} />
        </label>
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Паралелни часове</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label>Активни (намазване) мин</Label>
              <Input type="number" min={0} step={5} value={activeMin} onChange={(e) => setActiveMin(Number(e.target.value))} className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label>Престой (мин)</Label>
              <Input type="number" min={0} step={5} value={processingMin} onChange={(e) => setProcessingMin(Number(e.target.value))} className="h-11 text-base" />
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Престой &gt; 10 мин отваря паралелен час, докато боята действа. 0 = няма престой. Важи за всички, които предлагат услугата.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="mt-4 h-11 w-full rounded-full bg-foreground text-sm text-background hover:bg-primary">
          {saving ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази"}
        </Button>
    </>
  );
}

function AddSheet({
  groups,
  categories,
  onAdded,
}: {
  groups: string[];
  categories: MyCategoryOpt[];
  onAdded: () => void;
}) {
  const [name, setName] = React.useState("");
  const [groupTitle, setGroupTitle] = React.useState(groups[0] ?? "");
  // „pick" = избор от съществуващи групи (чипове); „new" = свободен текст за нова.
  const [groupMode, setGroupMode] = React.useState<"pick" | "new">(groups.length > 0 ? "pick" : "new");
  const [categorySlug, setCategorySlug] = React.useState(categories[0]?.slug ?? "");
  // Цената е ТЕКСТ, не type=number: БГ клавиатурата пише „25,50", а number полето
  // мълчаливо я губи (badInput → value "") — потребителят вижда попълнено поле,
  // а формата го брои за празно. Парсва се при запис през parseDecimalInput.
  const [price, setPrice] = React.useState("");
  const [priceFrom, setPriceFrom] = React.useState(false);
  const [durationMin, setDurationMin] = React.useState(30);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; group?: string; price?: string }>({});

  const isNewGroup = groupTitle.trim().length > 0 && !groups.includes(groupTitle.trim());

  async function save() {
    const parsedPrice = parseDecimalInput(price);
    const nextErrors = {
      name: name.trim() ? undefined : "Въведи име — така услугата ще се показва в ценоразписа.",
      group:
        groupTitle.trim() ? undefined : groupMode === "new" ? "Напиши име на новата група." : "Избери група от списъка.",
      price:
        parsedPrice !== null && parsedPrice > 0 ? undefined : "Въведи цена — само число, напр. 25 или 25,50.",
    };
    if (nextErrors.name || nextErrors.group || nextErrors.price) {
      setErrors(nextErrors);
      toast.error("Провери отбелязаните полета.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res = await createMyService({
        name: name.trim(),
        groupTitle: groupTitle.trim(),
        categorySlug: isNewGroup ? categorySlug : null,
        price: parsedPrice!,
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
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
      <SheetTitle className="text-base font-bold">Нова услуга</SheetTitle>
      <SheetDescription className="mt-1 text-xs text-muted-foreground">
        Влиза в общия ценоразпис на сайта и в онлайн записването при теб.
      </SheetDescription>
        <div className="mt-3 space-y-2.5">
          <div className="space-y-1.5">
            <Label>
              Име на услугата <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder="напр. Терапия с топли ножици"
              aria-invalid={!!errors.name}
              className={"h-11 text-base" + (errors.name ? " border-destructive" : "")}
            />
            {errors.name ? (
              <p role="alert" className="text-xs text-destructive">{errors.name}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Показва се в ценоразписа и при онлайн записване.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>
              Група (подкатегория) <span className="text-destructive">*</span>
            </Label>
            {groupMode === "pick" ? (
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGroupTitle(g);
                      if (errors.group) setErrors((p) => ({ ...p, group: undefined }));
                    }}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                      (groupTitle === g
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/50")
                    }
                  >
                    {g}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setGroupMode("new");
                    setGroupTitle("");
                  }}
                  className="rounded-full border border-dashed border-foreground/40 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  + Нова група
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Input
                  value={groupTitle}
                  onChange={(e) => {
                    setGroupTitle(e.target.value);
                    if (errors.group) setErrors((p) => ({ ...p, group: undefined }));
                  }}
                  placeholder="напр. Терапии за коса"
                  aria-invalid={!!errors.group}
                  className={"h-11 text-base" + (errors.group ? " border-destructive" : "")}
                  autoFocus
                />
                {groups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupMode("pick");
                      setGroupTitle(groups[0] ?? "");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    ← избери от съществуващите
                  </button>
                )}
              </div>
            )}
            {errors.group ? (
              <p role="alert" className="text-xs text-destructive">{errors.group}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Заглавието, под което услугата застава в ценоразписа.</p>
            )}
          </div>
          {isNewGroup && categories.length > 1 && (
            <div className="space-y-1.5">
              <Label>Категория за новата група</Label>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base">
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Цена (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors((p) => ({ ...p, price: undefined }));
                }}
                placeholder="напр. 25 или 25,50"
                aria-invalid={!!errors.price}
                className={"h-11 text-base" + (errors.price ? " border-destructive" : "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Продължителност (мин)</Label>
              <Input type="number" min={5} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="h-11 text-base" />
            </div>
          </div>
          {errors.price && (
            <p role="alert" className="text-xs text-destructive">{errors.price}</p>
          )}
          <label className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm font-medium">&quot;от&quot; цена (ориентировъчна)</span>
            <Switch checked={priceFrom} onCheckedChange={setPriceFrom} />
          </label>
        </div>
        <Button onClick={save} disabled={saving} className="mt-4 h-11 w-full rounded-full bg-foreground text-sm text-background hover:bg-primary">
          {saving ? <><Loader2 className="size-4 animate-spin" /> Добавяне</> : "Добави услугата"}
        </Button>
    </>
  );
}
