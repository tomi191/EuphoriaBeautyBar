import type { ServiceGroup } from "@/lib/data/services";
import { Reveal } from "@/components/reactbits/reveal";
import { serviceImageFor } from "@/lib/booking/length-icon";

interface PricingTableProps {
  groups: ServiceGroup[];
  hideHeader?: boolean;
}

export function PricingTable({ groups, hideHeader = false }: PricingTableProps) {
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
              {group.items.map((item) => (
                <li key={item.name} className="flex flex-wrap items-baseline gap-x-4 py-4">
                  {serviceImageFor(item.name, group.title) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={serviceImageFor(item.name, group.title)!}
                      alt={item.name}
                      className="size-11 shrink-0 self-center rounded-lg object-cover"
                    />
                  )}
                  <h4 className="text-base font-medium">{item.name}</h4>
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
              ))}
            </ul>
          </section>
        </Reveal>
      ))}
    </div>
  );
}
