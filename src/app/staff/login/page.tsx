"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { InstallBanner } from "@/components/staff/install-banner";
import { BiometricLoginButton } from "@/components/staff/biometric-login-button";

/** requireStaff пренасочва изключен изпълнител тук с ?inactive=1. */
function InactiveNotice() {
  const params = useSearchParams();
  if (params.get("inactive") !== "1") return null;
  return (
    <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center text-sm text-destructive">
      Достъпът до приложението е спрян. Обади се в салона.
    </p>
  );
}

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      toast.error("Грешен имейл или парола");
      setSubmitting(false);
      return;
    }
    router.replace("/staff");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo width={120} height={120} className="h-28 w-auto" href={null} />
        </div>
        <p className="mb-6 text-center text-sm text-muted-foreground">Вход за екипа</p>
        {/* useSearchParams иска Suspense, иначе статичната страница не се сглобява. */}
        <React.Suspense fallback={null}>
          <InactiveNotice />
        </React.Suspense>
        <InstallBanner />
        <BiometricLoginButton />
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-background p-8">
          <div className="space-y-2">
            <Label htmlFor="email">Имейл</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Парола</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" disabled={submitting} className="h-11 w-full rounded-full bg-foreground text-background hover:bg-primary">
            {submitting ? <><Loader2 className="size-4 animate-spin" /> Влизане</> : "Влез"}
          </Button>
          <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Нямаш достъп? Свържи се със Снежана.
          </p>
        </form>
      </div>
    </div>
  );
}
