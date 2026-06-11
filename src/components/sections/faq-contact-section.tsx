import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/reactbits/reveal";
import { Button } from "@/components/ui/button";
import { faqItems } from "@/lib/data/faq";
import { siteConfig } from "@/lib/site";

export function FaqContactSection() {
  return (
    <section id="faq" className="relative overflow-hidden border-y border-foreground/10 bg-cream py-24 lg:py-32">
      <Image
        src="/illustrations/dots.svg"
        alt=""
        aria-hidden
        width={120}
        height={80}
        className="pointer-events-none absolute right-12 top-12 hidden h-12 w-auto opacity-50 lg:block"
      />
      <Image
        src="/illustrations/squiggle.svg"
        alt=""
        aria-hidden
        width={400}
        height={60}
        className="pointer-events-none absolute -bottom-2 left-0 h-12 w-2/3 text-foreground/15"
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-12 lg:gap-16 lg:px-10">
        {/* FAQ — лявата колона */}
        <div className="lg:col-span-7">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/60">
              Често задавани въпроси
            </p>
            <h2 className="font-display text-4xl font-medium md:text-5xl lg:text-6xl">
              Имаш въпрос? <br />
              <em className="font-serif italic text-primary">Имаме отговор</em>.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="mt-10 w-full">
              {faqItems.slice(0, 6).map((item, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`} className="border-foreground/10">
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline data-[state=open]:text-primary">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>

        {/* CONTACT — дясната колона (sticky) */}
        <Reveal className="lg:col-span-5" delay={0.15}>
          <div className="sticky top-24 rounded-md border border-foreground/10 bg-background p-7 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">Бърза връзка</p>
            <h3 className="mt-2 font-display text-3xl">Предпочиташ да попиташ лично?</h3>

            <div className="mt-6 space-y-4 text-sm">
              <a href={`tel:${siteConfig.contact.phone}`} className="flex items-start gap-3 hover:text-primary">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint">
                  <Phone className="size-4" strokeWidth={1.6} />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground/70">Телефон</span>
                  <span className="font-medium">{siteConfig.contact.phoneFormatted}</span>
                </span>
              </a>

              <a href={`mailto:${siteConfig.contact.email}`} className="flex items-start gap-3 hover:text-primary">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush">
                  <Mail className="size-4" strokeWidth={1.6} />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground/70">Имейл</span>
                  <span className="font-medium">{siteConfig.contact.email}</span>
                </span>
              </a>

              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary">
                  <MapPin className="size-4" strokeWidth={1.6} />
                </span>
                <span>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground/70">Адрес</span>
                  <span className="font-medium">{siteConfig.address.full}</span>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream">
                  <Clock className="size-4" strokeWidth={1.6} />
                </span>
                <ul className="flex-1 space-y-0.5">
                  {siteConfig.hours.map((h) => (
                    <li key={h.day} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className="font-medium">{h.close ? `${h.open} – ${h.close}` : h.open}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button asChild size="lg" className="mt-8 h-12 w-full rounded-md bg-foreground text-background hover:bg-primary">
              <Link href="/zapazi-chas">Запиши час онлайн</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
