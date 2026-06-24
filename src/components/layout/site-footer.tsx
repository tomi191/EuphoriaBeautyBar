"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { DotPattern } from "@/components/reactbits/dot-pattern";
import { Separator } from "@/components/ui/separator";
import { siteConfig, navigation } from "@/lib/site";

export function SiteFooter() {
  const pathname = usePathname();
  // Скрит в админ панела и приложението за екипа.
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-secondary/40">
      <DotPattern className="text-purple/20" spacing={28} fade="top" />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-0 h-px bg-gradient-to-r from-transparent via-mint to-transparent"
      />
      <Image
        src="/illustrations/squiggle.svg"
        alt=""
        aria-hidden
        width={400}
        height={60}
        className="pointer-events-none absolute -top-4 right-12 h-10 w-2/5 text-foreground/15"
      />
      <Image
        src="/illustrations/wave.svg"
        alt=""
        aria-hidden
        width={360}
        height={200}
        className="pointer-events-none absolute -bottom-12 -right-12 hidden h-44 w-auto opacity-30 mix-blend-multiply lg:block"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo width={140} height={44} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener"
                aria-label="Facebook"
                className="grid size-10 place-items-center rounded-full border border-border bg-background transition-colors hover:border-primary hover:text-primary"
              >
                <Facebook className="size-4" strokeWidth={1.5} />
              </a>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-full border border-border bg-background transition-colors hover:border-primary hover:text-primary"
              >
                <Instagram className="size-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Карта на сайта</h4>
            <ul className="space-y-2.5 text-sm">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/karieri" className="text-muted-foreground transition-colors hover:text-primary">
                  Кариери
                </Link>
              </li>
              <li>
                <Link href="/salon-varna-levski" className="text-muted-foreground transition-colors hover:text-primary">
                  Салон кв. Левски, Варна
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Услуги</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/uslugi/frizorski-uslugi" className="text-muted-foreground hover:text-primary">Фризьорски услуги</Link></li>
              <li><Link href="/uslugi/balayazh-varna" className="text-muted-foreground hover:text-primary">Балаяж във Варна</Link></li>
              <li><Link href="/uslugi/frizorski-terapii" className="text-muted-foreground hover:text-primary">Фризьорски терапии</Link></li>
              <li><Link href="/uslugi/manikyur-i-pedikyur" className="text-muted-foreground hover:text-primary">Маникюр и педикюр</Link></li>
              <li><Link href="/uslugi/kozmetika" className="text-muted-foreground hover:text-primary">Козметика</Link></li>
              <li><Link href="/montibello" className="text-muted-foreground hover:text-primary">Montibello</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Намери ни</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={`tel:${siteConfig.contact.phone}`} className="flex items-start gap-2 text-muted-foreground hover:text-primary">
                  <Phone className="mt-0.5 size-3.5 shrink-0" />
                  <span>{siteConfig.contact.phoneFormatted}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${siteConfig.contact.email}`} className="flex items-start gap-2 text-muted-foreground hover:text-primary">
                  <Mail className="mt-0.5 size-3.5 shrink-0" />
                  <span>{siteConfig.contact.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <a href={siteConfig.address.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{siteConfig.address.full}</a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-10 bg-border/60" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Всички права запазени.</p>
          <p>
            Дизайн и разработка от{" "}
            <a
              href="https://level8.bg"
              target="_blank"
              rel="noopener"
              className="font-medium text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-primary hover:decoration-solid"
            >
              Level&nbsp;8
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
