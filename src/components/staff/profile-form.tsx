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

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center gap-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
            {image.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.trim()} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/brand/logo-mark-black.png" alt="" className="size-full object-contain dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/brand/logo-mark-white.png" alt="" className="hidden size-full object-contain dark:block" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label>Снимка (път или URL)</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/team/име.jpg" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Име</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label>Кратко описание</Label>
          <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="напр. специалист по цвят и подстригване" />
        </div>
        <Button type="submit" disabled={savingProfile} className="w-full rounded-full bg-foreground text-background hover:bg-primary">
          {savingProfile ? <><Loader2 className="size-4 animate-spin" /> Запазване</> : "Запази профила"}
        </Button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-border bg-background p-5">
        <p className="text-sm font-semibold">Смяна на парола</p>
        <div className="space-y-2">
          <Label>Текуща парола</Label>
          <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Нова парола</Label>
          <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <Button type="submit" variant="outline" disabled={savingPassword} className="w-full rounded-full">
          {savingPassword ? <><Loader2 className="size-4 animate-spin" /> Смяна</> : "Смени паролата"}
        </Button>
      </form>
    </div>
  );
}
