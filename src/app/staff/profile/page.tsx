import type { Metadata } from "next";
import { requireStaff } from "@/lib/actions/auth-guard";
import { StaffShell } from "@/components/staff/staff-shell";
import { StaffProfileForm } from "@/components/staff/profile-form";
import { StaffNotifications } from "@/components/staff/staff-notifications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профил — Euphoria",
  robots: { index: false, follow: false },
};

export default async function StaffProfilePage() {
  const { session, resource } = await requireStaff();

  return (
    <StaffShell>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-medium">Профил</h1>
        <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
      </div>
      <div className="mb-6">
        <StaffNotifications />
      </div>
      <StaffProfileForm initialName={resource.name} initialImage={resource.image} initialBio={resource.bio} />
    </StaffShell>
  );
}
