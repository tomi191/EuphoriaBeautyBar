import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ListingArchFigure, ListingMobileLine } from "@/components/rental/arch-figure";
import { MenuRow, StepLine } from "@/components/rental/bar-menu";
import { InquiryBar, InquiryButtons, RentalInquiryProvider } from "@/components/rental/rental-inquiry";
import {
  LISTING_BEGINNERS,
  LISTING_CONTRACT_ANSWER,
  LISTING_STEPS,
  LISTING_SUBTITLE,
  RENTAL_FALLBACK_IMAGE,
  seatsLine,
} from "@/lib/rental/public-copy";
import { cn } from "@/lib/utils";

export interface ListingViewData {
  slug: string;
  title: string;
  image: string | null;
  filled: boolean;
  benefits: { key: string; left: string; right: string }[];
  /** Своите редове на Снежана: редове от менюто без дясна част. */
  customBenefits: string[];
  /** Сумата на месец («350»), само при включен ключ «Показвай в обявата». */
  rent: string | null;
  /** Какво не е включено в наема: ред под сумата (само заедно с нея). */
  rentExcludes: string | null;
  /** Свободните места: при повече от едно обявата казва «Свободни са N места». */
  seats: number;
  specialty: string;
}

/**
 * Обявата, както я виждат хората (/karieri/<slug>). Същият компонент рисува и прегледа във формата
 * «Нова обява» (визия №12), затова тук няма четене от базата: всичко идва отвън.
 */
export function ListingView({ data, priority }: { data: ListingViewData; priority?: boolean }) {
  const { filled } = data;
  // Редът за наема (кадър Б-наем-390.png): сумата само при включен ключ, иначе «по договаряне».
  const rent: ReactNode = data.rent ? (
    <>
      <span className="font-sans text-[0.77em] not-italic text-foreground">{data.rent.replace(".", ",")}&nbsp;€</span> на месец
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
    <RentalInquiryProvider slug={data.slug} listingTitle={data.title} specialty={data.specialty}>
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
              {data.title}
            </h1>
            <p className="mt-4 font-serif text-[1.3rem] italic leading-[1.12] text-primary lg:mt-6 lg:text-[2.6rem]">
              <span className="block">{LISTING_SUBTITLE[0]}</span> <span className="block">{LISTING_SUBTITLE[1]}</span>
            </p>
            <p className="mt-4 max-w-[17rem] text-[0.95rem] leading-snug text-muted-foreground lg:mt-6 lg:max-w-none lg:text-xl">{LISTING_BEGINNERS}</p>
            <p className="mt-5 text-sm tracking-[0.06em] text-muted-foreground lg:mt-8 lg:text-lg">
              {!filled && seatsLine(data.seats) && <span className="block">{seatsLine(data.seats)}</span>}
              кв. Левски, Варна
            </p>
            {filled ? (
              <div className="hidden lg:block">{filledNotice}</div>
            ) : (
              <InquiryButtons className="mt-10 hidden lg:flex" />
            )}
          </div>
          <ListingArchFigure
            src={data.image ?? RENTAL_FALLBACK_IMAGE}
            alt="Работното място в салона"
            priority={priority}
            className="col-start-1 row-start-2 -mt-8 -mr-1.5 min-h-[18.75rem] w-[73%] self-stretch justify-self-end lg:col-start-2 lg:row-start-1 lg:mt-0 lg:mr-0 lg:min-h-0 lg:w-full lg:self-auto"
          />
          {filled && <div className="lg:hidden">{filledNotice}</div>}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-12 lg:grid-cols-2 lg:gap-x-16 lg:px-8 lg:pt-24 lg:pb-16">
        <div>
          <h2 className="text-[1.75rem] font-medium leading-[1.1] lg:text-[3.25rem]">Какво получаваш</h2>
          <ul className="mt-4 space-y-2 text-[0.95rem] lg:mt-8 lg:space-y-6 lg:text-2xl">
            {data.benefits.map((b) => (
              <MenuRow key={b.key} left={b.left} right={b.right} />
            ))}
            {data.customBenefits.map((text, i) => (
              <MenuRow key={`custom-${i}`} left={text} />
            ))}
            <MenuRow left="Наем" right={rent} note={data.rent ? data.rentExcludes : null} />
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
