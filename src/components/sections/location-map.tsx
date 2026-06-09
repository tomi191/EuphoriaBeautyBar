import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reactbits/reveal";
import { siteConfig } from "@/lib/site";

const { lat, lng } = siteConfig.address.coordinates;
const mapEmbedSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/**
 * LocationMap — секция "Намери ни". Адрес, работно време и телефон до
 * вграден Google Maps. Контактните данни идват от siteConfig, за да остане
 * един източник на истина с footer-а и FAQ секцията.
 */
export function LocationMap() {
  return (
    <section id="location" className="relative overflow-hidden bg-cream py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-stretch gap-10 px-4 lg:grid-cols-12 lg:gap-16 lg:px-10">
        {/* Текстова колона */}
        <Reveal className="lg:col-span-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
            Намери ни
          </span>
          <h2 className="mt-5 font-display text-5xl leading-[1] font-medium text-balance md:text-6xl">
            Как да <em className="font-serif italic text-primary">стигнеш</em> до нас.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/80">
            Салонът е в кв. Левски, близо до центъра на Варна, с лесен паркинг наоколо. Отбий се или ни се обади да запазиш час.
          </p>

          <div className="mt-8 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary">
                <MapPin className="size-4" strokeWidth={1.6} />
              </span>
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground/50">Адрес</span>
                <span className="font-medium">{siteConfig.address.full}</span>
              </span>
            </div>

            <a href={`tel:${siteConfig.contact.phone}`} className="flex items-start gap-3 hover:text-primary">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint">
                <Phone className="size-4" strokeWidth={1.6} />
              </span>
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground/50">Телефон</span>
                <span className="font-medium">{siteConfig.contact.phoneFormatted}</span>
              </span>
            </a>

            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush">
                <Clock className="size-4" strokeWidth={1.6} />
              </span>
              <ul className="flex-1 space-y-0.5">
                {siteConfig.hours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{h.day}</span>
                    <span className="font-medium">{h.close ? `${h.open} – ${h.close}` : h.open}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-md bg-foreground px-6 text-background hover:bg-primary"
          >
            <a href={directionsHref} target="_blank" rel="noopener noreferrer">
              <Navigation className="size-4" strokeWidth={1.8} />
              Опътване
            </a>
          </Button>
        </Reveal>

        {/* Карта */}
        <Reveal className="lg:col-span-7" delay={0.1}>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-foreground/15 bg-secondary soft-shadow lg:h-full">
            <iframe
              src={mapEmbedSrc}
              title="Карта с местоположението на Euphoria Hair & Beauty Bar в кв. Левски, Варна"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
