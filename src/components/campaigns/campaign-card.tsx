import Link from "next/link";
import { formatEuro } from "@/lib/booking/price";
import { longDay } from "@/lib/campaigns/rules";
import { cn } from "@/lib/utils";

/**
 * Картата на промоцията, посока А «Ред от менюто» (визия №26, кадри A-карта-*.png; в приложението и
 * администрацията по кръг 2). Едно тяло за прегледа в приложението и за публичните места (част 2 стъпва тук).
 * Двете цени винаги при намаление (ЗЗП чл. 64): зачертаната предишна и новата; процентът е само добавка.
 * Подаръкът е без сума. Без брояч: краят е дата (Саиф 1.10, 1.11).
 */
export type CampaignCardData = {
  kind: "discount" | "gift";
  who: string; // «при Снежана» / «при специалиста по маникюр»
  services: { name: string; prevEur: number | null; newEur: number | null; percent: number | null; regularEur: number | null; priceFrom: boolean }[];
  gift: string | null;
  reason: string | null;
  endsOn: string;
  firstVisitOnly: boolean;
  /** Колко места остават (живото число); null = без лимит. */
  slotsLeft: number | null;
  /** «Снежана» или «този специалист» (Саиф 1.7). */
  sameWho: string;
};

export function CampaignCard({
  data,
  today,
  href,
  className,
}: {
  data: CampaignCardData;
  today: string;
  /** Без адрес бутонът е само за вид (прегледът в приложението). */
  href?: string;
  className?: string;
}) {
  const lastDay = data.endsOn === today;
  const cta = data.kind === "discount" ? "Запиши с тази цена" : "Запиши час";
  const ctaLabel = `Запиши час за ${data.services.map((s) => s.name).join(", ")} ${data.who} по промоцията`;
  const ctaCls =
    "mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-base font-semibold text-background transition-colors hover:bg-foreground/85";

  return (
    <article className={cn("rounded-2xl border border-border bg-background px-4 pb-4 pt-3.5", className)}>
      <p className="text-center font-serif text-[22px] italic leading-tight text-primary">{data.who}</p>
      <div className="mt-2 divide-y divide-border/70 border-t border-border/70">
        {data.services.map((s) => (
          <div key={s.name} className="py-2.5">
            <p className="text-[17px] leading-snug text-foreground">{s.name}</p>
            {data.kind === "discount" && s.prevEur != null && s.newEur != null ? (
              <>
                <div className="mt-1 flex items-end gap-2" aria-hidden>
                  <span className="mb-2.5 min-w-4 flex-1 border-b-2 border-dotted border-muted-foreground/50" />
                  <s className="font-serif text-[26px] leading-none text-muted-foreground decoration-[1.5px]">{formatEuro(s.prevEur)}</s>
                  <span className="font-serif text-[40px] font-medium leading-none text-primary" style={{ fontVariantNumeric: "lining-nums" }}>
                    {formatEuro(s.newEur)}
                  </span>
                </div>
                {s.percent != null && (
                  <p className="mt-0.5 text-right font-serif text-[22px] font-medium leading-none text-primary" aria-hidden>
                    −{s.percent}%
                  </p>
                )}
                <p className="sr-only">
                  Предишна цена {formatEuro(s.prevEur)}, нова цена {formatEuro(s.newEur)}
                  {s.percent != null ? `, ${s.percent}% по-малко` : ""}.
                </p>
              </>
            ) : (
              <>
                <div className="mt-1 flex items-end gap-2">
                  <span className="mb-1.5 min-w-4 flex-1 border-b-2 border-dotted border-muted-foreground/50" aria-hidden />
                  <span className="font-serif text-[24px] leading-none text-foreground">
                    {s.regularEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {data.kind === "gift" && data.gift && (
        <p className="mt-1 font-serif text-[19px] italic leading-snug text-primary">Подарък в същия час: {data.gift}</p>
      )}
      <div className="mt-2 space-y-1 font-serif text-[19px] leading-snug">
        {data.firstVisitOnly && <p>Само за първо посещение при {data.sameWho}.</p>}
        {data.slotsLeft != null && (
          <p className="text-[21px] text-foreground/80">{data.slotsLeft === 1 ? "Остава 1 място." : `Остават ${data.slotsLeft} места.`}</p>
        )}
        <p className="text-muted-foreground">
          {lastDay ? `Последен ден: днес, ${longDay(data.endsOn, today)}.` : `Важи до ${longDay(data.endsOn, today)} включително.`}
        </p>
        {data.reason && <p className="italic text-primary/90">{data.reason}</p>}
      </div>
      {href ? (
        <Link href={href} aria-label={ctaLabel} className={ctaCls}>
          {cta}
        </Link>
      ) : (
        <span className={cn(ctaCls, "pointer-events-none")} aria-hidden>
          {cta}
        </span>
      )}
    </article>
  );
}
