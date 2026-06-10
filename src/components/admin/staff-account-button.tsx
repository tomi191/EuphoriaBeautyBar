"use client";

import * as React from "react";
import { Loader2, KeyRound, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaffAccount, resetStaffPassword } from "@/lib/actions/resources";

export function StaffAccountButton({
  resourceId,
  resourceName,
  hasAccount,
}: {
  resourceId: string;
  resourceName: string;
  hasAccount: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState(resourceName);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  if (hasAccount) {
    return <ResetPasswordButton resourceId={resourceId} resourceName={resourceName} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createStaffAccount(resourceId, { name, email, password });
      if (res.ok) {
        toast.success("Входът е създаден.");
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Грешка при създаване.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-3.5" /> Вход
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" description="Създава акаунт за вход на изпълнителя в приложението за екипа.">
          <DialogHeader>
            <DialogTitle>Вход за {resourceName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Изпълнителят ще влиза в приложението за екипа на <code>/staff</code> с този имейл и парола.
            </p>
            <div className="space-y-2">
              <Label>Име</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Имейл</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Парола</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="минимум 8 символа" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90">
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Създаване</> : "Създай вход"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Изпълнител с акаунт: ✓ вход + бутон за нова парола (забравена). */
function ResetPasswordButton({ resourceId, resourceName }: { resourceId: string; resourceName: string }) {
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await resetStaffPassword(resourceId, password);
      if (res.ok) {
        toast.success("Паролата е сменена. Старите сесии са затворени.");
        setOpen(false);
        setPassword("");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Грешка при смяната.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="size-3.5 text-primary" /> вход
        </span>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
          <KeyRound className="size-3" /> Нова парола
        </Button>
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" description="Задава нова парола за входа на изпълнителя и затваря активните му сесии.">
          <DialogHeader>
            <DialogTitle>Нова парола за {resourceName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              За забравена парола. Изпълнителят ще влезе наново с новата; старите му сесии се затварят.
            </p>
            <div className="space-y-2">
              <Label>Нова парола</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="минимум 8 символа" autoComplete="off" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90">
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Смяна</> : "Смени паролата"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
