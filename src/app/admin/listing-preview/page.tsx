import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ListingPreviewFrame } from "@/components/admin/listing-preview-frame";
import { auth } from "@/lib/auth";

// Прегледът във формата «Нова обява»: обявата, нарисувана със същия компонент като /karieri/<slug>,
// в собствен прозорец с ширината на телефон. Данните идват от формата (postMessage), не от базата.
export const dynamic = "force-dynamic";

export default async function ListingPreviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "admin") redirect("/admin/login");
  return <ListingPreviewFrame />;
}
