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
import {
  createTeamMember,
  updateTeamMember,
  uploadTeamMemberPhoto,
  discardTeamMemberPhoto,
  type TeamInput,
} from "@/lib/actions/team";
import { prepareFile } from "@/components/admin/gallery-upload-form";
import { TEAM_PHOTO_ERRORS } from "@/lib/images/team-photo-rules";
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
  const photoRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  // Качена в този прозорец, но още незапазена: трие се при нова снимка, «Махни» или затворена форма.
  const pendingRef = React.useRef<string | null>(null);

  function dropPending() {
    const url = pendingRef.current;
    pendingRef.current = null;
    if (url) void discardTeamMemberPhoto(url).catch(() => {});
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
      const res = await uploadTeamMemberPhoto(fd);
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
    const payload: TeamInput = { name, role, bio, experience, image: image.trim() || null, specialties, active };
    try {
      if (initial) {
        await updateTeamMember(initial.id, payload);
        toast.success("Записът е обновен.");
      } else {
        await createTeamMember(payload);
        toast.success("Член на екипа е добавен.");
      }
      pendingRef.current = null; // вече е записана
      setOpen(false);
    } catch (err) {
      toast.error("Грешка при запазване.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label>Снимка</Label>
            <div className="flex items-start gap-4">
              {/* Рамката на картата в «За нас»: 4:5, 120×150 (като «Изпълнители») */}
              <div className="relative h-[150px] w-[120px] shrink-0">
                <div aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-[14px] bg-mint" />
                <div className="relative grid size-full place-items-center overflow-hidden rounded-[14px] border border-border bg-secondary">
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Качване" />
                  ) : image.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.trim()} alt="Снимката на члена" className="size-full object-cover object-top" />
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
                <p className="text-xs text-muted-foreground">JPG, PNG или WebP, до 5&nbsp;MB.</p>
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
                placeholder="/images/team/име.webp или URL"
                aria-label="Адрес на снимка"
                className="mt-2"
              />
            </details>
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
