import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/rental/listing-view";
import { siteConfig } from "@/lib/site";
import { getListingBySlug, getOpenListings, withLiveRating } from "@/lib/data/rental-listings";
import { specialtyForCategory } from "@/lib/rental/inquiry-rules";
import { LISTING_OG_DESCRIPTION, listingOgTitle } from "@/lib/rental/public-copy";

// Страницата е статична; действията в администрацията я опресняват (revalidatePath). Веднъж на
// ден се опреснява и сама, за да хване новата оценка от Google.
export const revalidate = 86400;

export async function generateStaticParams() {
  // Без база при сглобката (Vercel preview) страниците се правят при първо отваряне.
  try {
    const listings = await getOpenListings();
    return listings.flatMap((l) => (l.slug ? [{ slug: l.slug }] : []));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return {};
  const ogTitle = listingOgTitle(listing.title);
  return {
    title: listing.title,
    description: LISTING_OG_DESCRIPTION,
    alternates: { canonical: `/karieri/${slug}` },
    // Заетото място остава с връзка (от Facebook), но не се предлага в Google.
    robots: listing.status === "filled" ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      url: `/karieri/${slug}`,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title: ogTitle,
      description: LISTING_OG_DESCRIPTION,
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: LISTING_OG_DESCRIPTION },
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const benefits = await withLiveRating(listing.benefits);
  return (
    <ListingView
      priority
      data={{
        slug,
        title: listing.title,
        image: listing.image,
        filled: listing.status === "filled",
        benefits,
        customBenefits: listing.customBenefits,
        rent: listing.rent,
        rentExcludes: listing.rentExcludes,
        seats: listing.seats,
        specialty: specialtyForCategory(listing.category?.slug, listing.services.map((s) => s.groupTitle)),
      }}
    />
  );
}
