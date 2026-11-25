import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Info, Phone, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";
import { forWhomOf, metaOf, type MontibelloProduct } from "@/lib/data/montibello";

// Общите части на посока А «Рафт по нужда» (визия №45): кадрите A-hub и A-produkt.
// Цени няма (думата на собственика, 25.11.2026): мястото на цената е «Обади се за цена и поръчка».

export const TEL = `tel:${siteConfig.contact.phone}`;
export const PHONE = siteConfig.contact.phoneFormatted;
export const ADDR = `${siteConfig.address.street}, ${siteConfig.address.district}`;
export const HOURS = "вт–пт 10:00–19:00 · сб 10:00–17:00";
export const CALL_LABEL = "Обади се за цена и поръчка";

/** Основният бутон: зелен, 48 px, телефон. */
export function CallButton({ className, label = CALL_LABEL }: { className?: string; label?: string }) {
  return (
    <a
      href={TEL}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 whitespace-nowrap text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        className,
      )}
    >
      <Phone className="size-[18px]" strokeWidth={2} aria-hidden />
      {label}
    </a>
  );
}

/** Вторичният бутон в картата: рамка, 44 px, зелен текст. */
function CardCall({ name }: { name: string }) {
  return (
    <a
      href={TEL}
      aria-label={`${CALL_LABEL}: ${name}`}
      className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-1.5 text-[13px] font-medium whitespace-nowrap lg:h-11 lg:gap-2 lg:px-2 lg:text-sm text-primary transition-colors hover:border-primary/40"
    >
      <Phone className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      {CALL_LABEL}
    </a>
  );
}

/** Малка снимка (Decode) не расте над размера на файла при 2×: по-малка, но остра. */
export function capOf(p: MontibelloProduct): React.CSSProperties | undefined {
  return p.imageSize ? { maxWidth: p.imageSize[0] / 2, maxHeight: p.imageSize[1] / 2 } : undefined;
}

function Pack({ p, sizes, className }: { p: MontibelloProduct; sizes: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[10px] bg-white", className)}>
      {p.officialImage && (
        <div className="absolute inset-0 flex items-center justify-center p-[9%]">
          <div className="relative size-full" style={capOf(p)}>
            <Image src={p.officialImage} alt={p.name} fill sizes={sizes} className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Карта на рафта (1440): бяло поле с опаковката, вид и обем, име, за кого, обаждане. */
export function ProductCard({ p }: { p: MontibelloProduct }) {
  return (
    <div className="flex flex-col">
      <Link href={`/montibello/${p.slug}`} className="group block">
        <Pack p={p} sizes="(min-width: 1024px) 286px, 50vw" className="aspect-[1/0.95]" />
        <p className="mt-3.5 text-[13px] leading-[18px] text-muted-foreground">{metaOf(p)}</p>
        <h3 className="mt-1 font-display text-lg font-medium leading-6 group-hover:text-primary">{p.name}</h3>
        <p className="mt-0.5 text-sm leading-[21px] text-muted-foreground">{forWhomOf(p)}</p>
      </Link>
      <div className="mt-auto pt-3">
        <CardCall name={p.name} />
      </div>
    </div>
  );
}

/** Ред на телефон (390): снимка вляво, текст и обаждане вдясно. */
export function ProductRow({ p }: { p: MontibelloProduct }) {
  return (
    <div className="flex gap-3.5">
      <Link href={`/montibello/${p.slug}`} className="block w-28 shrink-0" tabIndex={-1} aria-hidden>
        <Pack p={p} sizes="112px" className="h-[140px] w-28" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/montibello/${p.slug}`} className="block">
          <p className="text-xs leading-[18px] text-muted-foreground">{metaOf(p)}</p>
          <h3 className="mt-0.5 font-display text-[17px] font-medium leading-[22px]">{p.name}</h3>
          <p className="mt-0.5 text-[13px] leading-[19px] text-muted-foreground">{forWhomOf(p)}</p>
        </Link>
        <div className="mt-2.5">
          <CardCall name={p.name} />
        </div>
      </div>
    </div>
  );
}

/** Редовете за вземане: адрес, часове, без доставка. */
export function PickupLines({ hours = true, className }: { hours?: boolean; className?: string }) {
  const rows = [
    { Icon: Store, text: `Вземаш от салона: ${ADDR}` },
    ...(hours ? [{ Icon: Clock, text: HOURS }] : []),
    { Icon: Info, text: "Без доставка. Наличността потвърждаваме по телефона." },
  ];
  return (
    <ul className={cn("space-y-1 text-sm leading-6 text-muted-foreground", className)}>
      {rows.map(({ Icon, text }) => (
        <li key={text} className="flex gap-2.5">
          <Icon className="mt-1 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Въпроси: на 1440 заглавието вляво, списъкът от 400 px; първият е отворен. */
export function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="grid lg:grid-cols-[400px_1fr]">
      <h2 className="font-display text-[26px] font-medium leading-[34px] lg:text-[32px] lg:leading-10">Въпроси</h2>
      <div className="mt-4 border-b border-border lg:mt-0">
        {items.map((it, i) => (
          <details key={it.q} open={i === 0} className="group border-t border-border">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-base font-medium leading-7 lg:text-[17px] [&::-webkit-details-marker]:hidden">
              {it.q}
              <span aria-hidden className="relative size-5 shrink-0">
                <span className="absolute top-1/2 left-1/2 h-0.5 w-3.5 -translate-1/2 bg-foreground" />
                <span className="absolute top-1/2 left-1/2 h-3.5 w-0.5 -translate-1/2 bg-foreground group-open:hidden" />
              </span>
            </summary>
            <p className="max-w-[640px] pr-10 pb-5 text-[15px] leading-6 text-muted-foreground">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/** «Поръчай по телефона, вземи от салона»: снимката на салона и обаждането. */
export function PickupBlock() {
  return (
    <div className="grid gap-6 lg:grid-cols-[584px_1fr] lg:gap-16">
      <div className="relative h-[220px] overflow-hidden rounded-[10px] lg:h-[380px]">
        <Image
          src="/images/interior/hero-bg.webp"
          alt="Салон Euphoria на ул. Петър Райчев 18, Варна"
          fill
          sizes="(min-width: 1024px) 584px, 100vw"
          className="object-cover object-[75%_40%]"
        />
      </div>
      <div className="lg:pt-10">
        <h2 className="max-w-[520px] font-display text-2xl font-medium leading-8 lg:text-[32px] lg:leading-10">
          Поръчай по телефона, вземи от салона
        </h2>
        <a href={TEL} className="mt-3 block font-display text-2xl font-medium leading-8 text-primary lg:mt-5 lg:text-[28px] lg:leading-9">
          {PHONE}
        </a>
        <PickupLines className="mt-3 max-w-[520px] lg:mt-4" />
        <CallButton className="mt-4 hidden min-w-[268px] lg:inline-flex" />
      </div>
    </div>
  );
}

/** Връзка със стрелка (зелена, 15 px). */
export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-8 items-center gap-1.5 text-[15px] font-medium text-primary hover:underline">
      {children}
      <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
    </Link>
  );
}
