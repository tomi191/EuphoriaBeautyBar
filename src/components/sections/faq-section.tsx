import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/reactbits/reveal";
import { faqItems } from "@/lib/data/faq";

export function FaqSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <Image
        src="/illustrations/dots.svg"
        alt=""
        aria-hidden
        width={120}
        height={80}
        className="pointer-events-none absolute right-12 top-12 hidden h-12 w-auto opacity-40 lg:block"
      />
      <Image
        src="/illustrations/squiggle.svg"
        alt=""
        aria-hidden
        width={400}
        height={60}
        className="pointer-events-none absolute -bottom-2 left-0 h-12 w-2/3 text-foreground/20"
      />

      <div className="relative mx-auto grid max-w-7xl gap-16 px-4 lg:grid-cols-12 lg:px-8">
        <Reveal className="lg:col-span-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Често задавани въпроси
          </p>
          <h2 className="font-display text-4xl font-medium text-balance md:text-5xl lg:text-6xl">
            Имаш въпрос? <br />
            <span className="gradient-text">Имаме отговор.</span>
          </h2>
          <p className="mt-5 max-w-md font-serif text-lg italic text-muted-foreground">
            Ако не намираш отговор, винаги можеш да ни се обадиш или пишеш — отговаряме лично.
          </p>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.1}>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border-border/60">
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
    </section>
  );
}
