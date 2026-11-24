import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Images } from "lucide-react";
import { requireStaff } from "@/lib/actions/auth-guard";
import { getMyRevenue } from "@/lib/actions/revenue";
import { StaffShell } from "@/components/staff/staff-shell";
import { StaffProfileForm } from "@/components/staff/profile-form";
import { StaffNotifications } from "@/components/staff/staff-notifications";
import { TelegramConnect } from "@/components/staff/telegram-connect";
import { BiometricManage } from "@/components/staff/biometric-manage";
import { RevenueTriCards } from "@/components/revenue/revenue-tri-cards";
import { passkeysEnabled } from "@/lib/passkey-support";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профил — Euphoria",
  robots: { index: false, follow: false },
};

export default async function StaffProfilePage() {
  const { session, resource } = await requireStaff();
  const revenue = await getMyRevenue();

  return (
    <StaffShell kind={resource.kind}>
      <div className="mb-4">
        <h1 className="font-display text-xl font-medium">Профил</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{session.user.email}</p>
      </div>

      <section className="mb-4">
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Оборот</h2>
        <RevenueTriCards stats={revenue} />
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Изкарано = минали часове (без отменени/неявили се). Очаквано = предстоящи потвърдени часове. Ориентировъчно, по цените на услугите.
        </p>
      </section>

      <Link
        href="/staff/profile/photos"
        className="mb-3 flex h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-[15px] font-medium transition-colors hover:border-foreground/40"
      >
        <Images className="size-5 text-primary" strokeWidth={1.7} aria-hidden />
        <span className="flex-1">Моите снимки</span>
        <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.8} aria-hidden />
      </Link>

      <div className="mb-3 space-y-2">
        <TelegramConnect initialConnected={!!resource.telegramChatId} />
        <StaffNotifications />
      </div>

      {passkeysEnabled && (
        <section className="mb-3">
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Вход с отпечатък</h2>
          <BiometricManage />
        </section>
      )}

      <StaffProfileForm initialName={resource.name} initialImage={resource.image} initialBio={resource.bio} initialPhone={resource.phone} />
    </StaffShell>
  );
}
