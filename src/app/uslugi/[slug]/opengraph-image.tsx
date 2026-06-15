import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";
import { getServiceCatalog } from "@/lib/data/service-catalog";

export const alt = "Услуги — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cats = await getServiceCatalog();
  const cat = cats.find((c) => c.slug === slug);
  return renderOg({
    eyebrow: "Услуги · Варна",
    title: cat?.title ?? "Услуги",
    subtitle: cat?.description,
  });
}
