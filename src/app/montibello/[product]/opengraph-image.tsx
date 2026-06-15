import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";
import { montibelloProducts } from "@/lib/data/montibello";

export const alt = "Montibello — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ product: string }> }) {
  const { product: slug } = await params;
  const p = montibelloProducts.find((x) => x.slug === slug);
  return renderOg({
    eyebrow: p?.line ? `Montibello · ${p.line}` : "Montibello",
    title: p?.name ?? "Montibello",
    subtitle: p?.productType,
  });
}
