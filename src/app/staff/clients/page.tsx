import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireStaff } from "@/lib/actions/auth-guard";
import { getMyClients } from "@/lib/actions/staff-clients";
import { StaffShell } from "@/components/staff/staff-shell";
import { ClientsList } from "@/components/staff/clients-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Клиенти — Euphoria",
  robots: { index: false, follow: false },
};

export default async function StaffClientsPage() {
  await requireStaff();
  const clients = await getMyClients();

  return (
    <StaffShell>
      <div className="mb-4 flex items-center gap-1">
        <Link
          href="/staff"
          aria-label="Назад към графика"
          className="-ml-2 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-medium">Клиенти</h1>
          <p className="text-xs text-muted-foreground">
            {clients.length === 1 ? "1 клиент" : `${clients.length} клиенти`} с час при теб
          </p>
        </div>
      </div>
      <ClientsList clients={clients} />
    </StaffShell>
  );
}
