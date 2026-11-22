import { renderRentalOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/rental";
import { getListingBySlug } from "@/lib/data/rental-listings";
import { LISTING_SUBTITLE, RENTAL_FALLBACK_IMAGE } from "@/lib/rental/public-copy";

export const alt = "Място под наем в салона, кв. Левски, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  return renderRentalOg({
    title: listing?.title ?? "Места под наем",
    subtitle: LISTING_SUBTITLE,
    image: listing?.image ?? RENTAL_FALLBACK_IMAGE,
  });
}
