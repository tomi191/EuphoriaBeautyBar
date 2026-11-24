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
import {
  createResource,
  updateResource,
  endCooperation,
  uploadResourcePhoto,
  discardResourcePhoto,
  type ResourceInput,
} from "@/lib/actions/resources";
import { prepareFile } from "@/components/admin/gallery-upload-form";
import { TEAM_PHOTO_ERRORS } from "@/lib/images/team-photo-rules";
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
  const photoRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  // Качена в този прозорец, но още незапазена: трие се при нова снимка, «Махни» или затворена форма.
  const pendingRef = React.useRef<string | null>(null);

  function dropPending() {
    const url = pendingRef.current;
    pendingRef.current = null;
    if (url) void discardResourcePhoto(url).catch(() => {});
  }

  async function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploading(true);
    try {
      let prepared: Awaited<ReturnType<typeof prepareFile>>;
      try {
        prepared = await prepareFile(file); // смаляване в браузъра; HEIC, който браузърът не отваря, пада тук
      } catch {
        setPhotoError(/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type) ? TEAM_PHOTO_ERRORS.heic : TEAM_PHOTO_ERRORS.notReadable);
        return;
      }
      URL.revokeObjectURL(prepared.previewUrl);
      const fd = new FormData();
      fd.append("file", prepared.file);
      const res = await uploadResourcePhoto(fd);
      if (!res.ok) {
        setPhotoError(res.error);
        return;
      }
      dropPending();
      pendingRef.current = res.url;
      setImage(res.url);
    } catch {
      setPhotoError("Грешка при качване. Опитай пак.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    dropPending();
    setImage("");
    setPhotoError(null);
  }

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o && pendingRef.current) {
      dropPending();
      setImage(initial?.image ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload: ResourceInput = { name, kind, color: color || null, image: image.trim() || null, bio: bio.trim() || null, active, publicConsent: consent };
    try {
      if (initial) {
        await updateResource(initial.id, payload);
        pendingRef.current = null; // вече е записана
        toast.success("Изпълнителят е обновен.");
      } else {
        const created = await createResource(payload);
        toast.success("Изпълнителят е добавен.");
        pendingRef.current = null;
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
      <Dialog open={open} onOpenChange={onOpenChange}>
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
              <div className="flex items-start gap-4">
                {/* Рамката на картата в «За нас»: 4:5, 120×150 */}
                <div className="relative h-[150px] w-[120px] shrink-0">
                  <div aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-[14px] bg-mint" />
                  <div className="relative grid size-full place-items-center overflow-hidden rounded-[14px] border border-border bg-secondary">
                    {uploading ? (
                      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Качване" />
                    ) : image.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.trim()} alt="Снимката на изпълнителя" className="size-full object-cover object-top" />
                    ) : (
                      <span className="px-2 text-center text-xs text-muted-foreground">Без снимка</span>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-2">
                  {image.trim() ? (
                    <>
                      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => photoRef.current?.click()}>
                        Смени
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={removePhoto}>
                        Махни
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => photoRef.current?.click()}>
                      Качи снимка
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">JPG, PNG или WebP, до 5&nbsp;MB. Без снимка се ползва логото на салона.</p>
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onPhotoPick} />
              {photoError && (
                <p role="alert" className="text-sm text-destructive">
                  {photoError}
                </p>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">или адрес на снимка</summary>
                <Input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/images/team/име.jpg или URL"
                  aria-label="Адрес на снимка"
                  className="mt-2"
                />
              </details>
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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
