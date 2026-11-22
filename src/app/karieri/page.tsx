import type { Metadata } from "next";
import { ListArchFigure, ListMobileLine } from "@/components/rental/arch-figure";
import { MenuLinkRow } from "@/components/rental/bar-menu";
import { RentalCallBar, RentalCallButtons } from "@/components/rental/rental-contact";
import { db } from "@/lib/db";
import { getOpenListings, type PublicListing } from "@/lib/data/rental-listings";
import { positionForCategory } from "@/lib/rental/listing-rules";
import { LIST_INTRO, RENTAL_FALLBACK_IMAGE } from "@/lib/rental/public-copy";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const LIST_TITLE = "Места под наем за самостоятелни специалисти";

export const metadata: Metadata = {
  title: "Места под наем",
  alternates: { canonical: "/karieri" },
  description: LIST_INTRO,
  openGraph: { type: "website", url: "/karieri", siteName: siteConfig.name, locale: siteConfig.locale, title: LIST_TITLE, description: LIST_INTRO },
  twitter: { card: "summary_large_image", title: LIST_TITLE, description: LIST_INTRO },
};

function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase("bg-BG") + s.slice(1);
}

/**
 * Ред от менюто: вляво позицията, вдясно категорията в курсив. Стар ред (без категория) излиза със
 * своето заглавие; ако няма и своя страница, редът води към телефона.
 */
function row(l: PublicListing) {
  const left = l.category ? capitalize(positionForCategory(l.category.slug)) : l.title;
  const right = l.category ? l.category.title.toLocaleLowerCase("bg-BG") : "обади се";
  const href = l.slug ? `/karieri/${l.slug}` : `tel:${siteConfig.contact.phone}`;
  const label = l.slug ? `${l.title}: виж обявата` : `${l.title}: обади се на салона`;
  return { key: l.id, left, right, href, label };
}

export default async function RentalListPage() {
  const [listings, rentalOpenRow] = await Promise.all([
    getOpenListings(),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "rental_open") }),
  ]);
  // Общият превключвател в администрацията («отдаваме ли място под наем») остава в сила.
  const rentalOpen = rentalOpenRow ? Boolean(rentalOpenRow.value) : true;
  const rows = rentalOpen ? listings.map(row) : [];
  const empty = rows.length === 0;

  return (
    <>
      {/* На телефон секцията пълни екрана: долният край на сайта не влиза в първия екран. */}
      <section
        className={cn(
          "relative overflow-hidden lg:min-h-0",
          empty ? "min-h-[calc(100svh-5rem-var(--rental-bar-h)-env(safe-area-inset-bottom))]" : "min-h-[calc(100svh-5rem)]",
        )}
      >
        <ListMobileLine className="lg:hidden" />
        <div className="mx-auto grid max-w-7xl px-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-x-8 lg:px-8">
          <div className="relative z-10 pt-8 pb-14 lg:pt-[6.5rem] lg:pb-24">
            <h1 className="text-[2.375rem] font-medium leading-[0.98] lg:text-[5.75rem] lg:leading-[0.97]">
              <span className="block lg:max-w-[10ch]">Места под наем</span>
              <span className="mt-3 block font-serif text-[1.65rem] font-normal italic leading-[1.1] tracking-normal text-primary lg:mt-4 lg:text-[3rem]">
                за самостоятелни специалисти
              </span>
            </h1>
            {!empty && (
              <p className="mt-6 max-w-[46ch] text-base leading-relaxed lg:mt-10 lg:text-xl">{LIST_INTRO}</p>
            )}

            <h2 className={cn(empty ? "mt-8" : "mt-12", "text-[1.75rem] font-medium lg:mt-16 lg:text-[3.25rem]")}>Свободни места</h2>
            {empty ? (
              <div className="mt-5 lg:mt-8">
                <p className="font-serif text-[1.6rem] italic leading-tight text-primary lg:text-[2.25rem]">
                  В момента няма свободни места.
                </p>
                <p className="mt-4 text-pretty text-base lg:text-xl">Когато се освободи, обявата ще се появи тук.</p>
                <RentalCallButtons className="mt-10 hidden lg:flex" />
              </div>
            ) : (
              <ul className="mt-4 text-base lg:mt-6 lg:text-[1.75rem]">
                {rows.map((r) => (
                  <MenuLinkRow key={r.key} href={r.href} left={r.left} right={r.right} label={r.label} />
                ))}
              </ul>
            )}
          </div>
          <ListArchFigure
            src={RENTAL_FALLBACK_IMAGE}
            alt="Салонът в кв. Левски"
            className="hidden w-full self-start lg:block"
          />
        </div>
      </section>
      {empty && <RentalCallBar />}
    </>
  );
}
