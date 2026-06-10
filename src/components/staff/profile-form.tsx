"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { updateStaffProfile } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StaffProfileForm({
  initialName,
  initialImage,
  initialBio,
}: {
  initialName: string;
  initialImage: string | null;
  initialBio: string | null;
}) {
  const [name, setName] = React.useState(initialName);
  const [image, setImage] = React.useState(initialImage ?? "");
  const [bio, setBio] = React.useState(initialBio ?? "");
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateStaffProfile({ name, image: image.trim() || null, bio: bio.trim() || null });
      toast.success("Профилът е запазен.");
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Новата парола е минимум 8 символа.");
      return;
    }
    setSavingPassword(true);
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    if (error) {
      toast.error("Грешка — провери текущата парола.");
    } else {
      toast.success("Паролата е сменена.");
      setCurrentPassword("");
      setNewPassword("");
    }
    setSavingPassword(false);
  }

  // Бележка за плътността: input текстът остава 16px (text-base) — под това iOS
  // Safari прави принудителен zoom при фокус. Стягаме височини/отстояния/лейбъли.
  return (
    <div className="space-y-3">
      <form onSubmit={saveProfile} className="space-y-3 rounded-xl border border-border bg-background p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
            {image.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.trim()} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/brand/logo-mark-black.png" alt="" className="size-full object-contain dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/brand/logo-mark-white.png" alt="" className="hidden size-full object-contain dark:block" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Label className="text-xs">Снимка</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/team/име.jpg" className="h-10" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Име</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Кратко описание</Label>
          <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="напр. специалист по цвят и подстригване" />
        </div>
        <Button type="submit" disabled={savingProfile} size="sm" className="h-10 w-full rounded-full bg-foreground text-background hover:bg-primary active:scale-[0.98]">
          {savingProfile ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази"}
        </Button>
      </form>

      <form onSubmit={changePassword} className="space-y-3 rounded-xl border border-border bg-background p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Смяна на парола</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Текуща</Label>
            <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Нова (мин. 8)</Label>
            <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="h-10" />
          </div>
        </div>
        <Button type="submit" variant="outline" disabled={savingPassword} size="sm" className="h-10 w-full rounded-full active:scale-[0.98]">
          {savingPassword ? <><Loader2 className="size-4 animate-spin" /> Смяна</> : "Смени паролата"}
        </Button>
      </form>
    </div>
  );
}
