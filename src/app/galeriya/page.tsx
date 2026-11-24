import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GalleryGrid, type GalleryDisplayImage, type GalleryLinkInfo } from "@/components/gallery/gallery-grid";
import { db } from "@/lib/db";
import { galleryCategories } from "@/lib/data/gallery";
import { listPublicGalleryImages } from "@/lib/data/public-gallery";
import { LANDINGS } from "@/lib/seo/related-links";

export const metadata: Metadata = {
  title: "Галерия",
  alternates: { canonical: "/galeriya" },
  description:
    "Преди и после: боядисване, прически, маникюр, грим и сватбени стилове от Euphoria Hair & Beauty Bar във Варна.",
};

/** «Балаяж» → «балаяж» (в «Запиши час за балаяж»). */
function lower(s: string) {
  return s.charAt(0).toLocaleLowerCase("bg") + s.slice(1);
}

/** Страницата с цените за услуга или вид работа: първо отделната (балаяж, кичури…), после общата. */
function landingFor(text: string) {
  return LANDINGS.find((l) => l.pattern.test(text.toLocaleLowerCase("bg")));
}

export default async function GalleryPage() {
  // Живее в БД (не в статичния seed файл) — админът качва/трие снимки от /admin/gallery
  // и action-ът revalidate-ва тази страница.
  const images = await listPublicGalleryImages();

  // Услугата, към която е вързана снимката: «Запиши час за <услуга>» (визия №32).
  const serviceIds = [...new Set(images.map((i) => i.serviceItemId).filter((id): id is string => !!id))];
  const [items, cats] = serviceIds.length
    ? await Promise.all([
        db.query.serviceItems.findMany({ where: (s, { inArray }) => inArray(s.id, serviceIds) }),
        db.query.serviceCategories.findMany({ columns: { id: true, slug: true } }),
      ])
    : [[], []];
  const itemById = new Map(items.map((i) => [i.id, i]));
  const catSlug = new Map(cats.map((c) => [c.id, c.slug]));

  const display: GalleryDisplayImage[] = images.map((img) => {
    const label = galleryCategories.find((c) => c.value === img.category)?.label ?? "Нашата работа";
    const svc = img.serviceItemId ? itemById.get(img.serviceItemId) : undefined;
    let info: GalleryLinkInfo;
    if (svc) {
      const landing = landingFor(svc.name);
      const slug = catSlug.get(svc.categoryId);
      info = {
        kicker: label,
        name: svc.name,
        bookHref: svc.bookableOnline ? `/zapazi-chas?usluga=${encodeURIComponent(svc.id)}` : "/zapazi-chas",
        bookLabel: svc.bookableOnline ? `Запиши час за ${lower(svc.name)}` : "Запиши час",
        pageHref: landing?.href ?? (slug ? `/uslugi/${slug}` : "/uslugi"),
        pageLabel: `Виж ${lower(svc.name)} и цените`,
      };
    } else {
      const landing = landingFor(label);
      info = {
        kicker: null,
        name: label,
        bookHref: "/zapazi-chas",
        bookLabel: "Запиши час",
        pageHref: landing?.href ?? "/uslugi",
        pageLabel: landing ? `Виж ${lower(label)} и цените` : "Виж услугите и цените",
      };
    }
    return {
      id: img.id,
      src: img.src,
      alt: img.alt,
      category: img.category,
      width: img.width,
      height: img.height,
      description: img.description,
      info,
    };
  });

  return (
    <section className="pb-16 lg:pb-[72px]">
      <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-8 lg:pt-14">
        <h1 className="font-display text-[40px] leading-[44px] font-medium tracking-[-1px] lg:text-[64px] lg:leading-[68px] lg:tracking-[-1.6px]">
          Нашата работа
        </h1>
        <p className="mt-3 font-serif text-xl leading-7 text-foreground/80 italic lg:text-[22px] lg:leading-[30px]">
          Снимки от салона в кв. Левски: цвят, подстригване, прически и маникюр.
        </p>

        <GalleryGrid images={display} />

        <div className="mt-10 rounded-3xl bg-secondary px-6 py-7 lg:mt-14 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:p-14">
          <div>
            <h2 className="font-display text-[26px] leading-tight font-medium lg:text-[40px]">Искаш нещо подобно?</h2>
            <p className="mt-3 text-base leading-6 text-muted-foreground lg:text-[17px]">
              Запиши час онлайн или се обади, ако не знаеш коя услуга ти трябва.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-5 lg:mt-0 lg:shrink-0 lg:items-end">
            <Link
              href="/zapazi-chas"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-[15px] font-medium text-background focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Запиши час
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/uslugi"
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary underline underline-offset-4"
            >
              Виж услугите и цените
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
