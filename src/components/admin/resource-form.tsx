"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelWithHint } from "@/components/ui/field-hint";
import { FIELD_HINTS } from "@/lib/data/field-hints";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createResource, updateResource, endCooperation, type ResourceInput } from "@/lib/actions/resources";
import type { Resource } from "@/lib/db/schema";
import { futureBookingsLabel } from "@/lib/booking/future-bookings";
import { isEnded } from "@/lib/booking/ended";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const KINDS: Array<{ value: "hair" | "nails" | "cosmetics"; label: string }> = [
  { value: "hair", label: "Коса" },
  { value: "nails", label: "Нокти" },
  { value: "cosmetics", label: "Лице / Козметика" },
];

export function ResourceForm({
  trigger,
  initial,
  consentAt = null,
  futureBookings = 0,
  defaultOpen = false,
  returnTo,
}: {
  trigger: React.ReactNode;
  initial?: Resource;
  /** Кога е отбелязано писменото съгласие (ISO); null = няма. */
  consentAt?: string | null;
  futureBookings?: number; // бъдещи часове (за потвърждението при приключване)
  /** Отворена още при зареждане (идва от «Добави нов изпълнител» в «Места под наем»). */
  defaultOpen?: boolean;
  /** След създаване връща там (с ?picked=<новия изпълнител>). */
  returnTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  const ended = !!initial && isEnded(initial);

  const [name, setName] = React.useState(initial?.name ?? "");
  const [kind, setKind] = React.useState<"hair" | "nails" | "cosmetics">((initial?.kind as "hair" | "nails" | "cosmetics") ?? "hair");
  const [color, setColor] = React.useState(initial?.color ?? "#8FC7A6");
  const [image, setImage] = React.useState(initial?.image ?? "");
  const [bio, setBio] = React.useState(initial?.bio ?? "");
  const [active, setActive] = React.useState(initial?.active ?? true);
  const [consent, setConsent] = React.useState(!!consentAt);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: ResourceInput = { name, kind, color: color || null, image: image.trim() || null, bio: bio.trim() || null, active, publicConsent: consent };
    try {
      if (initial) {
        await updateResource(initial.id, payload);
        toast.success("Изпълнителят е обновен.");
      } else {
        const created = await createResource(payload);
        toast.success("Изпълнителят е добавен.");
        if (returnTo) {
          router.push(`${returnTo}${returnTo.includes("?") ? "&" : "?"}picked=${encodeURIComponent(created.id)}`);
        }
      }
      setOpen(false);
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    if (!initial) return;
    setEnding(true);
    try {
      const res = await endCooperation(initial.id);
      if (res.ok) {
        toast.success(`Сътрудничеството с ${initial.name} е приключено.`);
        setActive(false); // иначе следващото „Запази" щеше да го покаже пак
        setConfirmEnd(false);
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Грешка при приключването.");
    } finally {
      setEnding(false);
    }
  }

  const future = futureBookingsLabel(futureBookings, initial?.name ?? "");
  const upcomingHref = initial ? `/admin/bookings?resource=${initial.id}&upcoming=1` : "";

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
              <LabelWithHint htmlFor="res-kind" label="Тип услуги" hint={FIELD_HINTS.resourceKind} />
              <select id="res-kind" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as "hair" | "nails" | "cosmetics")}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <LabelWithHint htmlFor="res-color" label="Цвят в календара" hint={FIELD_HINTS.resourceColor} />
              <input id="res-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-md border border-input bg-background" />
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
            <div className="space-y-1.5 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="res-consent" className="cursor-pointer leading-snug">
                  Писмено съгласие: име и снимка на сайта
                </Label>
                <Switch id="res-consent" checked={consent} onCheckedChange={setConsent} />
              </div>
              <p className="text-xs text-muted-foreground">
                {consent && consentAt
                  ? `Отбелязано на ${new Date(consentAt).toLocaleDateString("bg-BG")}. `
                  : ""}
                Включи го само ако специалистът е подписал съгласие. Без него в «За нас» и при записването излиза само с
                какво се занимава, без име и снимка. Ако си оттегли съгласието, изключи го. Снежана излиза винаги с името си.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="res-active" className="cursor-pointer">Активен (приема записвания)</Label>
              <Switch id="res-active" checked={active} onCheckedChange={setActive} />
            </div>
            {initial && ended && (
              <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                Сътрудничеството е приключено и {initial.name} няма вход. Ако се върне, създай му нов вход с бутона
                „Вход“ в списъка и включи „Активен“.
              </p>
            )}
            {initial && !ended && !confirmEnd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmEnd(true)}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Приключи сътрудничеството
              </Button>
            )}
            {initial && !ended && confirmEnd && (
              <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p>
                  {initial.name} губи входа в приложението, Telegram и известията и изчезва от сайта. Историята на часовете и
                  оборотът остават.
                </p>
                <p className="font-medium">
                  {futureBookings > 0 ? (
                    <>
                      {future.text}. {futureBookings === 1 ? "Не се отказва сам." : "Не се отказват сами."}{" "}
                      <Link href={upcomingHref} className="underline underline-offset-2">
                        {future.see.charAt(0).toUpperCase() + future.see.slice(1)}
                      </Link>
                    </>
                  ) : (
                    "Няма бъдещи часове."
                  )}
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmEnd(false)}>
                    Отказ
                  </Button>
                  <Button type="button" variant="destructive" size="sm" disabled={ending} onClick={handleEnd}>
                    {ending ? <><Loader2 className="size-4 animate-spin" /> Приключване</> : "Да, приключи"}
                  </Button>
                </div>
              </div>
            )}
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
