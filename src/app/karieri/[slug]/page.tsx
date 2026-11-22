import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ListingArchFigure, ListingMobileLine } from "@/components/rental/arch-figure";
import { MenuRow, StepLine } from "@/components/rental/bar-menu";
import { InquiryBar, InquiryButtons, RentalInquiryProvider } from "@/components/rental/rental-inquiry";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";
import { getListingBySlug, getOpenListings } from "@/lib/data/rental-listings";
import type { RentalBenefit } from "@/lib/rental/benefits";
import { specialtyForCategory } from "@/lib/rental/inquiry-rules";
import {
  LISTING_BEGINNERS,
  LISTING_CONTRACT_ANSWER,
  LISTING_OG_DESCRIPTION,
  LISTING_STEPS,
  LISTING_SUBTITLE,
  listingOgTitle,
  RENTAL_FALLBACK_IMAGE,
} from "@/lib/rental/public-copy";
import { cn } from "@/lib/utils";

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
  // Редът за наема (кадър Б-наем-390.png): сумата само при включен ключ, иначе «по договаряне».
  const rent = listing.rent ? (
    <>
      <span className="font-sans text-[0.77em] not-italic text-foreground">{listing.rent.replace(".", ",")}&nbsp;€</span> на месец
    </>
  ) : (
    "по договаряне"
  );
  // На телефон снимката лежи под текста (една клетка), затова там блокът е под снимката, а не до нея.
  const filledNotice = (
    <div className="mt-8 lg:mt-10">
      <p className="text-lg font-medium">Мястото вече е заето.</p>
      <Link
        href="/karieri"
        className="mt-4 inline-flex h-14 items-center gap-2 rounded-full bg-foreground px-6 text-lg font-medium text-background hover:bg-foreground/90"
      >
        Виж свободните места <ArrowRight className="size-5" aria-hidden />
      </Link>
    </div>
  );

  return (
    <RentalInquiryProvider slug={slug} listingTitle={listing.title} specialty={specialtyForCategory(listing.category?.slug)}>
      <section className="relative overflow-hidden">
        {/* На телефон героят е висок колкото екрана без шапката и лентата: арката стига до лентата. */}
        <div
          className={cn(
            "mx-auto grid max-w-7xl grid-rows-[auto_1fr] px-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:grid-rows-none lg:gap-x-0 lg:px-8",
            filled ? "min-h-[calc(100svh-5rem)]" : "min-h-[calc(100svh-5rem-var(--rental-bar-h)-env(safe-area-inset-bottom))]",
          )}
        >
          <ListingMobileLine className="col-start-1 row-start-1 mb-8 -mr-1.5 w-[73%] self-stretch justify-self-end lg:hidden" />
          <div className="relative z-10 col-start-1 row-start-1 pt-6 pb-0 lg:pt-[6.5rem] lg:pb-0">
            <h1 className="max-w-[11ch] text-[2.375rem] font-medium leading-[0.98] lg:text-[5.75rem] lg:leading-[0.97]">
              {listing.title}
            </h1>
            <p className="mt-4 font-serif text-[1.3rem] italic leading-[1.12] text-primary lg:mt-6 lg:text-[2.6rem]">
              <span className="block">{LISTING_SUBTITLE[0]}</span> <span className="block">{LISTING_SUBTITLE[1]}</span>
            </p>
            <p className="mt-4 max-w-[17rem] text-[0.95rem] leading-snug text-muted-foreground lg:mt-6 lg:max-w-none lg:text-xl">{LISTING_BEGINNERS}</p>
            <p className="mt-5 text-sm tracking-[0.06em] text-muted-foreground lg:mt-8 lg:text-lg">кв. Левски, Варна</p>
            {filled ? (
              <div className="hidden lg:block">{filledNotice}</div>
            ) : (
              <InquiryButtons className="mt-10 hidden lg:flex" />
            )}
          </div>
          <ListingArchFigure
            src={listing.image ?? RENTAL_FALLBACK_IMAGE}
            alt="Работното място в салона"
            priority
            className="col-start-1 row-start-2 -mt-8 -mr-1.5 min-h-[18.75rem] w-[73%] self-stretch justify-self-end lg:col-start-2 lg:row-start-1 lg:mt-0 lg:mr-0 lg:min-h-0 lg:w-full lg:self-auto"
          />
          {filled && <div className="lg:hidden">{filledNotice}</div>}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-12 lg:grid-cols-2 lg:gap-x-16 lg:px-8 lg:pt-24 lg:pb-16">
        <div>
          <h2 className="text-[1.75rem] font-medium leading-[1.1] lg:text-[3.25rem]">Какво получаваш</h2>
          <ul className="mt-4 space-y-2 text-[0.95rem] lg:mt-8 lg:space-y-6 lg:text-2xl">
            {benefits.map((b) => (
              <MenuRow key={b.key} left={b.left} right={b.right} />
            ))}
            <MenuRow left="Наем" right={rent} />
          </ul>
        </div>
        <div>
          <h2 className="text-[1.75rem] font-medium leading-[1.1] lg:text-[3.25rem]">Как става</h2>
          <StepLine steps={LISTING_STEPS} className="mt-4 text-[0.95rem] leading-snug lg:mt-9 lg:text-2xl" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pt-8 lg:pb-28">
        <h2 className="text-[1.75rem] font-medium leading-[1.1] lg:text-[3.25rem]">Трудов договор ли е?</h2>
        <p className="mt-4 max-w-[34ch] text-[1.125rem] leading-snug lg:mt-6 lg:max-w-[40ch] lg:text-[2.25rem]">
          {LISTING_CONTRACT_ANSWER}
        </p>
        {!filled && <InquiryButtons className="mt-10 hidden lg:flex" />}
      </section>

      {!filled && <InquiryBar />}
    </RentalInquiryProvider>
  );
}
