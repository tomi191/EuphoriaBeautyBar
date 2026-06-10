import type { Metadata } from "next";
import { requireStaff } from "@/lib/actions/auth-guard";
import { getMyStats } from "@/lib/actions/staff-bookings";
import { StaffShell } from "@/components/staff/staff-shell";
import { StaffProfileForm } from "@/components/staff/profile-form";
import { StaffNotifications } from "@/components/staff/staff-notifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профил — Euphoria",
  robots: { index: false, follow: false },
};

/** Форматира сума в €: цели числа без стотинки, иначе 2 знака с десетична запетая. */
function eur(v: number): string {
  const r = Math.round(v * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2)).replace(".", ",");
}

export default async function StaffProfilePage() {
  const { session, resource } = await requireStaff();
  const stats = await getMyStats();

  const cards = [
    { label: "Днес", s: stats.today },
    { label: "Седмица", s: stats.week },
    { label: "Месец", s: stats.month },
  ];

  return (
    <StaffShell>
      <div className="mb-4">
        <h1 className="font-display text-xl font-medium">Профил</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{session.user.email}</p>
      </div>

      <section className="mb-4">
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Оборот</h2>
        <div className="grid grid-cols-3 gap-1.5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-background px-2 py-2.5 text-center">
              <p className="text-[10px] font-medium text-muted-foreground">{c.label}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums">{eur(c.s.total)} €</p>
              <p className="text-[10px] text-muted-foreground">{c.s.count === 1 ? "1 час" : `${c.s.count} часа`}</p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">По цените на услугите; ориентировъчно.</p>
      </section>

      <div className="mb-3">
        <StaffNotifications />
      </div>
      <StaffProfileForm initialName={resource.name} initialImage={resource.image} initialBio={resource.bio} />
    </StaffShell>
  );
}
