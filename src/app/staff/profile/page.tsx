import type { Metadata } from "next";
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
