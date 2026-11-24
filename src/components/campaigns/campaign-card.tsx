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
  phone,
  variant = "app",
  className,
}: {
  data: CampaignCardData;
  today: string;
  /** Без адрес бутонът е само за вид (прегледът в приложението). */
  href?: string;
  /** Услугата се записва само по телефона (наемател без онлайн график): бутонът звъни. */
  phone?: boolean;
  /** «app»: карта в приложението и администрацията; «menu»: ред от менюто на сайта (кадри A-карта-*, кръг 2). */
  variant?: "app" | "menu";
  className?: string;
}) {
  if (variant === "menu") return <MenuCard data={data} today={today} href={href} phone={phone} className={className} />;
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
                  <s className="font-serif text-[26px] leading-none text-muted-foreground decoration-[1.5px] [font-feature-settings:'locl'_0,'lnum'_1]">{formatEuro(s.prevEur)}</s>
                  <span className="font-serif-semi text-[40px] font-semibold leading-none text-primary [font-feature-settings:'locl'_0,'lnum'_1]">
                    {formatEuro(s.newEur)}
                  </span>
                </div>
                {s.percent != null && (
                  <p className="mt-0.5 text-right font-serif-semi text-[22px] font-semibold leading-none text-primary [font-feature-settings:'locl'_0,'lnum'_1]" aria-hidden>
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
                  <span className="font-serif text-[24px] leading-none text-foreground [font-feature-settings:'locl'_0,'lnum'_1]">
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
      <div className="mt-2 space-y-1 font-serif text-[19px] leading-snug [font-feature-settings:'locl'_0,'lnum'_1]">
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

/** Срокът (Саиф 1.10, 1.11): последният ден е «Последен ден: днес, …», иначе «Важи до … включително.». */
export const endsLine = (endsOn: string, today: string) =>
  endsOn === today ? `Последен ден: днес, ${longDay(endsOn, today)}.` : `Важи до ${longDay(endsOn, today)} включително.`;

/** Името на бутона (Саиф 1.12–1.14); при запис само по телефона «Обади се за час». */
export function campaignCta(data: CampaignCardData, phone?: boolean) {
  const what = `${data.services.map((s) => s.name).join(", ")} ${data.who} по промоцията`;
  if (phone) return { text: "Обади се за час", label: `Обади се за час за ${what}` };
  return { text: data.kind === "discount" ? "Запиши с тази цена" : "Запиши час", label: `Запиши час за ${what}` };
}

// Под lang=bg правият Cormorant и Manrope вземат българските форми (д като g); кадрите са с основните, а БГ формите
// са само в заглавията (Канопус, част 2, т. 1). Курсивът «при …» ги пази.
const upright = "[font-feature-settings:'locl'_0,'lnum'_1]";
// Тесен интервал преди € в цените на 1440 (Канопус, част 2, т. 4в).
const thin = (s: string) => s.replace(/\s(?=€)/u, String.fromCharCode(0x202f));

function MenuCard({
  data,
  today,
  href,
  phone,
  className,
}: {
  data: CampaignCardData;
  today: string;
  href?: string;
  phone?: boolean;
  className?: string;
}) {
  const cta = campaignCta(data, phone);
  // «−20%» на 1440 е ред в потока; условията почват под него с малък отстъп по мастилото (Канопус, обща сверка, т. А).
  const hasPct = data.kind === "discount" && data.services.some((s) => s.percent != null);
  const btn =
    "mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-8 font-display text-[17px] font-semibold text-background transition-colors hover:bg-foreground/85 [font-feature-settings:'locl'_0] lg:mt-auto lg:h-[53px] lg:w-auto lg:min-w-[312px] lg:self-start lg:text-[19px]";
  return (
    <article className={cn("text-left lg:flex lg:flex-col", className)}>
      <p className="font-serif text-[30px] italic leading-tight text-primary lg:text-[27px] lg:leading-none">{data.who}</p>
      {data.services.map((s) => (
        <div key={s.name} className="mt-1.5 lg:-mt-3.5">
          {data.kind === "discount" && s.prevEur != null && s.newEur != null ? (
            <>
              <div className="lg:flex lg:items-baseline lg:gap-3">
                <p className={cn("font-display text-[19px] leading-snug text-foreground lg:shrink lg:font-serif-semi lg:text-[26px] lg:font-semibold lg:leading-tight lg:[text-wrap:balance]", upright)}>
                  {s.name}
                </p>
                <div className="mt-1 lg:mt-0 lg:flex-1" aria-hidden>
                <div className="flex items-baseline gap-2.5">
                  <span className="mb-1.5 min-w-8 flex-1 self-end border-b-2 border-dotted border-muted-foreground/45 lg:min-w-4" />
                  <s className={cn("shrink-0 font-display text-[22px] leading-none text-muted-foreground decoration-[1.5px] lg:font-serif lg:text-[32px]", upright)}>
                    <span className="lg:hidden">{formatEuro(s.prevEur)}</span>
                    <span className="hidden lg:inline">{thin(formatEuro(s.prevEur))}</span>
                  </s>
                  <span
                    className={cn("shrink-0 font-display text-[36px] font-semibold leading-none text-primary lg:font-serif-semi lg:text-[48px] lg:font-semibold", upright)}
                    style={{ fontVariantNumeric: "lining-nums" }}
                  >
                    <span className="lg:hidden">{formatEuro(s.newEur)}</span>
                    <span className="hidden lg:inline">{thin(formatEuro(s.newEur))}</span>
                  </span>
                  {s.percent != null && <span className={cn("font-display text-[22px] font-medium leading-none text-primary lg:hidden", upright)}>−{s.percent}%</span>}
                </div>
                {/* На 1440 «−20%» е ред вдясно под новата цена, в колоната ѝ и в потока: бута условията (Канопус, обща сверка, т. А). */}
                {s.percent != null && (
                  <p className={cn("-mt-2 hidden text-right font-serif-semi text-[34px] font-semibold leading-none text-primary lg:block", upright)}>
                    −{s.percent}%
                  </p>
                )}
                </div>
              </div>
              <p className="sr-only">
                Предишна цена {formatEuro(s.prevEur)}, нова цена {formatEuro(s.newEur)}
                {s.percent != null ? `, ${s.percent}% по-малко` : ""}.
              </p>
            </>
          ) : (
            <div className="flex items-baseline gap-2.5">
              <p className={cn("font-display text-[17px] leading-snug text-foreground lg:font-serif-semi lg:text-[26px] lg:font-semibold lg:leading-tight lg:[text-wrap:balance]", upright)}>{s.name}</p>
              <span className="mb-1.5 min-w-6 flex-1 self-end border-b-2 border-dotted border-muted-foreground/45" aria-hidden />
              <span className={cn("shrink-0 font-display text-[19px] leading-none text-foreground lg:font-serif-semi lg:text-[46px] lg:font-semibold", upright)}>
                {s.regularEur != null ? `${s.priceFrom ? "от " : ""}${formatEuro(s.regularEur)}` : ""}
              </span>
            </div>
          )}
        </div>
      ))}
      {data.kind === "gift" && data.gift && (
        <p className="mt-1.5 font-display text-[17px] leading-snug text-foreground max-lg:[font-feature-settings:'locl'_0] lg:mt-5 lg:font-serif lg:text-[24px] lg:italic lg:text-muted-foreground">
          Подарък в същия час: {data.gift}
        </p>
      )}
      <div className={cn("mt-3 space-y-0.5 font-display text-[17px] leading-snug text-muted-foreground lg:mb-3 lg:font-serif lg:text-[24px] lg:text-foreground/70", hasPct ? "lg:-mt-1" : "lg:mt-1", upright)}>
        {/* На 1440 условията са 600 и по-тъмни от срока (Канопус, част 2, т. 5). */}
        {data.firstVisitOnly && <p className="lg:font-serif-semi lg:font-semibold lg:text-foreground/85">Само за първо посещение при {data.sameWho}.</p>}
        {data.slotsLeft != null && (
          <p className="lg:font-serif-semi lg:font-semibold lg:text-foreground/85">{data.slotsLeft === 1 ? "Остава 1 място." : `Остават ${data.slotsLeft} места.`}</p>
        )}
        <p className={cn(data.firstVisitOnly || data.slotsLeft != null ? "pt-3" : "pt-2", "lg:pt-0")}>{endsLine(data.endsOn, today)}</p>
      </div>
      {href ? (
        phone ? (
          <a href={href} aria-label={cta.label} className={btn}>
            {cta.text}
          </a>
        ) : (
          <Link href={href} aria-label={cta.label} className={btn}>
            {cta.text}
          </Link>
        )
      ) : (
        <span className={cn(btn, "pointer-events-none")} aria-hidden>
          {cta.text}
        </span>
      )}
    </article>
  );
}
