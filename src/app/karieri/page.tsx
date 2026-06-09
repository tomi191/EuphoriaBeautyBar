import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Award, Briefcase, Heart, Users } from "lucide-react";
import { Reveal } from "@/components/reactbits/reveal";
import { BlurText } from "@/components/reactbits/blur-text";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Места под наем",
  description: "Свободни работни места под наем в Euphoria Hair & Beauty Bar, кв. Левски, Варна.",
};

const benefits = [
  { icon: Heart, title: "Спокойна обстановка", text: "Уважение и място, в което да работиш на спокойствие." },
  { icon: Award, title: "Утвърдено име", text: "Салон с име в кв. Левски и стабилен поток клиенти." },
  { icon: Briefcase, title: "Гъвкав график", text: "Работиш по свой график, под наем." },
  { icon: Users, title: "Готова клиентска база", text: "Не започваш от нула." },
];

export default async function CareersPage() {
  const [positions, rentalOpenRow] = await Promise.all([
    db.query.rentalPositions.findMany({
      where: (p, { eq }) => eq(p.active, true),
      orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.title)],
    }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "rental_open") }),
  ]);
  const rentalOpen = rentalOpenRow ? Boolean(rentalOpenRow.value) : true;
  const showOpenings = rentalOpen && positions.length > 0;

  return (
    <>
      <section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
        <Image
          src="/illustrations/scissors.svg"
          alt=""
          aria-hidden
          width={280}
          height={280}
          className="pointer-events-none absolute right-[5%] top-20 hidden h-40 w-auto rotate-[18deg] opacity-50 mix-blend-multiply lg:block"
        />
        <Image
          src="/illustrations/nail-polish.svg"
          alt=""
          aria-hidden
          width={220}
          height={300}
          className="pointer-events-none absolute right-[20%] top-32 hidden h-32 w-auto -rotate-12 opacity-45 mix-blend-multiply lg:block"
        />

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <Reveal>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">Под наем</p>
          </Reveal>
          <BlurText
            as="h1"
            text={showOpenings ? "Свободно място под наем." : "Места под наем."}
            className="font-display text-6xl font-medium md:text-8xl"
          />
          <Reveal delay={0.4}>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-muted-foreground">
              {showOpenings
                ? "Отдаваме под наем работно място в утвърден салон в кв. Левски. Готова клиентска база и гъвкав график."
                : "В момента няма свободни места. Ако ти е интересно за в бъдеще, пиши ни и пазим контакта."}
            </p>
          </Reveal>
        </div>
      </section>

      {showOpenings ? (
        <>
          <section className="border-y border-border/40 bg-secondary/20 py-16">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {benefits.map((b, i) => (
                  <Reveal key={b.title} delay={i * 0.06}>
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-primary">
                        <b.icon className="size-5" strokeWidth={1.6} />
                      </div>
                      <div>
                        <h3 className="font-medium">{b.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 lg:py-32">
            <div className="mx-auto max-w-5xl px-4 lg:px-8">
              <Reveal>
                <h2 className="font-display text-4xl font-medium md:text-5xl">Свободни места</h2>
                <p className="mt-3 text-muted-foreground">
                  Пиши ни на{" "}
                  <a href={`mailto:${siteConfig.contact.email}`} className="text-primary hover:underline">
                    {siteConfig.contact.email}
                  </a>{" "}
                  или се обади на {siteConfig.contact.phoneFormatted}, за да се видим.
                </p>
              </Reveal>

              <div className="mt-12 space-y-4">
                {positions.map((p, idx) => (
                  <Reveal key={p.id} delay={idx * 0.08}>
                    <article className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-soft md:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-2xl font-medium">{p.title}</h3>
                          <p className="mt-1 text-xs uppercase tracking-wider text-primary">{p.type}</p>
                        </div>
                        <Button asChild variant="outline" className="rounded-full">
                          <a href={`mailto:${siteConfig.contact.email}?subject=Запитване за място под наем: ${p.title}`}>
                            Пиши ни <ArrowRight className="size-4" />
                          </a>
                        </Button>
                      </div>
                      <p className="mt-4 text-muted-foreground">{p.description}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {p.skills.map((s) => (
                          <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
            <Reveal>
              <p className="text-lg text-muted-foreground">
                Ако те интересува работа при нас, пиши ни на{" "}
                <a href={`mailto:${siteConfig.contact.email}`} className="text-primary hover:underline">
                  {siteConfig.contact.email}
                </a>{" "}
                или се обади на {siteConfig.contact.phoneFormatted}.
              </p>
              <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-foreground px-8 text-background hover:bg-foreground/90">
                <a href={`tel:${siteConfig.contact.phone}`}>Обади се</a>
              </Button>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
