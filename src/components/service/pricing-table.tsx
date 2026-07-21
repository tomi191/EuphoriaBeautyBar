import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ServiceGroup } from "@/lib/data/services";
import { Reveal } from "@/components/reactbits/reveal";
import { serviceImageFor } from "@/lib/booking/length-icon";
import { SERVICE_CONTENT } from "@/lib/data/service-content";
import { slugify } from "@/lib/utils";

interface PricingTableProps {
  groups: ServiceGroup[];
  hideHeader?: boolean;
  /** Slug на категорията — при подаден, услугите със собствена страница стават линкове. */
  categorySlug?: string;
}

export function PricingTable({ groups, hideHeader = false, categorySlug }: PricingTableProps) {
  return (
    <div className="space-y-16">
      {groups.map((group, gi) => (
        <Reveal key={group.title} delay={gi * 0.05}>
          <section>
            {!hideHeader && (
              <header className="mb-6 flex items-baseline justify-between border-b border-border/60 pb-3">
                <h3 className="font-display text-2xl font-medium md:text-3xl">{group.title}</h3>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.items.length} услуги
                </span>
              </header>
            )}
            <ul className="divide-y divide-border/40">
              {group.items.map((item) => {
                const detailSlug = slugify(item.name);
                const detailHref =
                  categorySlug && SERVICE_CONTENT[detailSlug] ? `/uslugi/${categorySlug}/${detailSlug}` : null;
                return (
                  <li key={item.name} className="flex flex-wrap items-baseline gap-x-4 py-4">
                    <span className="flex items-center gap-3">
                      {serviceImageFor(item.name, group.title) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={serviceImageFor(item.name, group.title)!}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          width={44}
                          height={44}
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      {detailHref ? (
                        <h4 className="text-base font-medium">
                          <Link href={detailHref} className="group/link inline-flex items-center gap-1 hover:text-primary">
                            {item.name}
                            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover/link:translate-x-0.5" />
                          </Link>
                        </h4>
                      ) : (
                        <h4 className="text-base font-medium">{item.name}</h4>
                      )}
                    </span>
                    <span aria-hidden className="hidden flex-1 translate-y-[-3px] border-b border-dotted border-border/60 sm:block" />
                    <div className="ml-auto flex items-baseline gap-1 whitespace-nowrap font-display text-lg font-medium text-primary">
                      {item.priceFrom && <span className="text-sm font-normal text-muted-foreground">от</span>}
                      <span>{item.price}</span>
                      {item.priceMax && (
                        <>
                          <span className="text-sm font-normal text-muted-foreground">–</span>
                          <span>{item.priceMax}</span>
                        </>
                      )}
                      <span className="text-sm font-normal text-muted-foreground">{item.currency}</span>
                    </div>
                    {item.description && (
                      <p className="mt-1 w-full text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>
      ))}
    </div>
  );
}
