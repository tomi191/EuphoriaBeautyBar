import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ListingArchFigure } from "@/components/rental/arch-figure";
import { MenuRow, StepLine } from "@/components/rental/bar-menu";
import { RentalCallBar, RentalCallButtons } from "@/components/rental/rental-contact";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";
import { getListingBySlug, getOpenListings } from "@/lib/data/rental-listings";
import type { RentalBenefit } from "@/lib/rental/benefits";
import { LISTING_OG_DESCRIPTION, listingOgTitle, RENTAL_FALLBACK_IMAGE } from "@/lib/rental/public-copy";

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

const STEPS = [
  "Обаждаш се и идваш да видиш мястото",
  "Подписваме договор за мястото",
  "Влизаш в приложението и нагласяш услугите, цените и часовете си",
];

/** Оценката на салона идва от отзивите в базата (думата на Саиф, т. 11); без тях остава текстът от списъка. */
async function withLiveRating(benefits: RentalBenefit[]): Promise<{ key: string; left: string; right: string }[]> {
  if (!benefits.some((b) => b.key === "google-rating")) return benefits;
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "google_reviews_summary") });
  const rating = (row?.value as { rating?: number } | undefined)?.rating;
  if (!rating) return benefits;
  const value = rating.toLocaleString("bg-BG", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return benefits.map((b) => (b.key === "google-rating" ? { ...b, left: `Салон с оценка ${value}` } : b));
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const filled = listing.status === "filled";
  const benefits = await withLiveRating(listing.benefits);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-x-6 lg:px-8">
          <div className="relative z-10 pt-6 pb-8 [grid-area:1/1] lg:pt-[6.5rem] lg:pb-0">
            <h1 className="max-w-[11ch] text-[2.375rem] font-medium leading-[0.98] lg:text-[5.75rem] lg:leading-[0.97]">
              {listing.title}
            </h1>
            <p className="mt-4 font-serif text-[1.3rem] italic leading-[1.12] text-primary lg:mt-6 lg:text-[2.6rem]">
              <span className="block">Работиш като своя фирма,</span> <span className="block">под името на салона.</span>
            </p>
            <p className="mt-5 text-sm tracking-[0.06em] text-muted-foreground lg:mt-8 lg:text-lg">кв. Левски, Варна</p>
            {filled ? (
              <div className="mt-8 lg:mt-10">
                <p className="text-lg font-medium">Мястото вече е заето.</p>
                <Link
                  href="/karieri"
                  className="mt-4 inline-flex h-14 items-center gap-2 rounded-full bg-foreground px-6 text-lg font-medium text-background hover:bg-foreground/90"
                >
                  Виж свободните места <ArrowRight className="size-5" aria-hidden />
                </Link>
              </div>
            ) : (
              <RentalCallButtons className="mt-10 hidden lg:flex" />
            )}
          </div>
          <ListingArchFigure
            src={listing.image ?? RENTAL_FALLBACK_IMAGE}
            alt="Работното място в салона"
            priority
            className="w-[69%] justify-self-end [grid-area:1/1] lg:col-start-2 lg:w-full lg:[grid-area:auto]"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-12 lg:grid-cols-2 lg:gap-x-16 lg:px-8 lg:pt-24 lg:pb-16">
        {benefits.length > 0 && (
          <div>
            <h2 className="text-[1.75rem] font-medium lg:text-[3.25rem]">Какво получаваш</h2>
            <ul className="mt-5 space-y-3 text-[0.95rem] lg:mt-8 lg:space-y-5 lg:text-xl">
              {benefits.map((b) => (
                <MenuRow key={b.key} left={b.left} right={b.right} />
              ))}
            </ul>
          </div>
        )}
        <div>
          <h2 className="text-[1.75rem] font-medium lg:text-[3.25rem]">Как става</h2>
          <StepLine steps={STEPS} className="mt-6 text-[1.0625rem] lg:mt-9 lg:text-xl" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pt-8 lg:pb-28">
        <h2 className="text-[1.75rem] font-medium lg:text-[3.25rem]">Трудов договор ли е?</h2>
        <p className="mt-4 max-w-[34ch] text-[1.125rem] leading-snug lg:mt-6 lg:max-w-[40ch] lg:text-[1.9rem]">
          Не. Договорът е за мястото, а ти си самостоятелен специалист със своя фирма.
        </p>
        {!filled && <RentalCallButtons className="mt-10 hidden lg:flex" />}
      </section>

      {!filled && <RentalCallBar />}
    </>
  );
}
