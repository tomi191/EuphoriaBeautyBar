"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
    toast.success("Здравей.");
    router.replace(params.get("from") ?? "/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md border border-border bg-background p-8">
      <div className="space-y-2">
        <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Имейл</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-md" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Парола</Label>
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-md" />
      </div>
      <Button type="submit" disabled={submitting} className="h-11 w-full rounded-md bg-foreground text-background hover:bg-foreground/90">
        {submitting ? <><Loader2 className="size-4 animate-spin" /> Влизане</> : "Влез"}
      </Button>
      <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
        Забравена парола? Свържи се с екипа на{" "}
        <a href="https://level8.bg" target="_blank" rel="noopener" className="text-foreground hover:underline">Level&nbsp;8</a>.
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo width={140} height={48} href={null} />
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Admin panel</p>
          <p className="mt-1 text-sm text-muted-foreground">Управление на съдържанието на euphoriabeauty.eu</p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-md border border-border bg-background" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
