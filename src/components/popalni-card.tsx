import Link from "next/link";
import { ArrowRight, Camera, ChevronRight, Clock, Scissors, Signature, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PopalniIcon, PopalniRow } from "@/lib/admin/popalni";

const ICON: Record<PopalniIcon, LucideIcon> = { price: Scissors, camera: Camera, consent: Signature, clock: Clock };

/**
 * «Какво да попълниш» (визия №45): картата в «Табло» (admin) и в «Твоят ден» (staff), кадри
 * A-popalni-admin-1440.png и A-popalni-staff-390.png. Без липси не се рисува.
 */
export function PopalniCard({ rows, variant }: { rows: PopalniRow[]; variant: "admin" | "staff" }) {
  if (rows.length === 0) return null;
  const admin = variant === "admin";
  return (
    <section
      aria-labelledby="popalni-title"
      className={cn("border border-border bg-background", admin ? "mb-8 rounded-xl p-6" : "mb-5 rounded-2xl p-5")}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <h2 id="popalni-title" className={cn("flex items-center gap-3 font-sans font-medium", admin ? "text-xl" : "text-lg")}>
          Какво да попълниш
          <span className="grid h-6 min-w-8 place-items-center rounded-full bg-blush/50 px-2 text-sm font-medium tabular-nums text-destructive-deep">
            {rows.length}
          </span>
        </h2>
        {admin && <p className="text-sm text-muted-foreground">Картата изчезва, когато всичко е попълнено</p>}
      </div>
      <ul className={cn("divide-y divide-border", admin ? "mt-3" : "mt-2")}>
        {rows.map((r) => {
          const Icon = ICON[r.icon];
          return (
            <li key={r.key} className={cn("flex gap-4", admin ? "py-5 md:items-center" : "py-4")}>
              <span className={cn("grid shrink-0 place-items-center rounded-full bg-secondary", admin ? "size-11" : "size-10")}>
                <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", admin ? "text-lg" : "text-base")}>{r.title}</p>
                <p className={cn("mt-0.5 text-muted-foreground", admin ? "text-[15px]" : "text-sm")}>{r.detail}</p>
                <FillButton row={r} className={cn("mt-3", admin && "md:hidden")} />
              </div>
              {admin && <FillButton row={r} className="hidden md:inline-flex" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FillButton({ row, className }: { row: PopalniRow; className?: string }) {
  return (
    <Link
      href={row.href}
      className={cn(
        "inline-flex h-12 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-8 text-base font-medium transition-colors hover:border-foreground/40 hover:bg-secondary",
        className,
      )}
    >
      {row.action} <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

/** Редовете над известията в камбанката (кадър A-popalni-kambanka-1440.png). */
export function PopalniBellSection({ rows, onNavigate }: { rows: PopalniRow[]; onNavigate?: () => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="border-b border-border bg-secondary/60 px-3 pb-1 pt-2.5">
      <p className="text-xs font-medium">Какво да попълниш</p>
      <ul className="divide-y divide-border/70">
        {rows.map((r) => {
          const Icon = ICON[r.icon];
          return (
            <li key={r.key}>
              <Link href={r.href} onClick={onNavigate} className="flex min-h-16 items-center gap-3 py-2 transition-opacity hover:opacity-80">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background">
                  <Icon className="size-4" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-xs text-muted-foreground">{r.place}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
