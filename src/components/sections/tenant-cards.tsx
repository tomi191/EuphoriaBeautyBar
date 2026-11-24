import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";
import type { TenantCard } from "@/lib/data/tenants";
import { TENANT_ROLE } from "@/lib/data/tenant-identity";
import { TenantWorkButton } from "@/components/sections/tenant-work-button";

/** «Свободно място в салона»: пунктирният блок към обявите (само при отворена обява). */
function VacancyBlock() {
  return (
    <div className="flex flex-col rounded-[20px] border border-dashed border-foreground/25 p-4 lg:px-7 lg:pt-6 lg:pb-5">
      <h3 className="font-display text-lg font-medium leading-snug lg:text-2xl">Свободно място в салона</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground lg:text-base">
        Работиш със своя фирма? Наеми работно място при нас.
      </p>
      <Link
        href="/karieri"
        className="mt-2 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-primary lg:mt-auto lg:min-h-12 lg:text-[15px]"
      >
        <span className="underline underline-offset-4">Виж местата под наем</span>
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function Card({ t }: { t: TenantCard }) {
  const role = TENANT_ROLE[t.kind] ?? t.kind;
  const workTitle = t.name ? `Работа на ${t.name}` : `Работа: ${role.toLowerCase()}`;
  return (
    <article className="flex flex-col rounded-[20px] border border-border bg-card p-4 lg:p-5">
      <div className="flex gap-3 lg:gap-4">
        {t.image && (
          <div className="relative h-[120px] w-24 shrink-0 lg:h-[150px] lg:w-[120px]">
            <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-[14px] bg-mint lg:translate-x-[6px] lg:translate-y-[6px]" />
            <div className="relative size-full overflow-hidden rounded-[14px]">
              <Image
                src={t.image}
                alt={`${t.name ?? "Специалист"}, ${role.toLowerCase()}, в салон Euphoria`}
                fill
                sizes="120px"
                className="object-cover object-top"
              />
            </div>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-xl font-medium leading-tight lg:text-2xl">{t.name ?? role}</h3>
          {t.name && (
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.05em] text-primary lg:text-[13px]">{role}</p>
          )}
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground lg:text-[15px]">
            Самостоятелен специалист в&nbsp;салона
          </p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-4 lg:pt-5">
        {t.online ? (
          <Link
            href="/zapazi-chas"
            className="inline-flex h-12 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background lg:text-[15px] transition-colors hover:bg-foreground/90"
          >
            Запиши час
          </Link>
        ) : (
          <a
            href={`tel:${siteConfig.contact.phone}`}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-foreground px-5 text-sm font-semibold transition-colors lg:text-[15px] hover:bg-foreground hover:text-background"
          >
            <Phone className="size-4" /> Обади се за час
          </a>
        )}
        {t.portfolio.length > 0 && <TenantWorkButton title={workTitle} portfolio={t.portfolio} />}
      </div>
    </article>
  );
}

/**
 * «Също в салона»: специалистите под наем под картата на Снежана (кадри Г-за-нас-390/1440,
 * визия №21). Без наематели остава само пунктирният блок (ако има отворена обява).
 */
export function TenantCards({ tenants, rentalOpen }: { tenants: TenantCard[]; rentalOpen: boolean }) {
  if (tenants.length === 0) {
    return rentalOpen ? (
      <div className="mt-12 max-w-md lg:mt-20">
        <VacancyBlock />
      </div>
    ) : null;
  }
  return (
    <div className="mt-12 border-t border-border pt-6 lg:mt-20 lg:pt-10">
      <h2 className="font-display text-2xl font-medium lg:text-[32px]">Също в салона</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-7 lg:grid-cols-[412fr_412fr_344fr] lg:gap-6">
        {tenants.map((t) => (
          <Card key={t.id} t={t} />
        ))}
        {rentalOpen && <VacancyBlock />}
      </div>
    </div>
  );
}
