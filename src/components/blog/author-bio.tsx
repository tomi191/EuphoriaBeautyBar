import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Авторска секция за статиите в Журнала.
 *
 * Всички статии са от собственичката Снежана Саблева, затова авторът е
 * хардкодна константа (без DB колона). Снимката е реалната team снимка, ако
 * липсва, Image ще покаже alt; пътят е статичен в /public.
 */
export const BLOG_AUTHOR = {
  name: "Снежана Саблева",
  role: "Собственик и фризьор-стилист, Euphoria",
  bio: "Над 25 години зад стола. Създава Euphoria в кв. Левски, Варна, за да работи с време и внимание към всеки клиент. Пише от практиката, не от учебника.",
  image: "/images/team/snezhana.jpg",
  profileUrl: "/za-nas",
} as const;

export function AuthorBio() {
  return (
    <aside className="mt-16 flex flex-col gap-5 rounded-2xl border border-border/60 bg-secondary/30 p-6 sm:flex-row sm:items-center sm:p-8">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-secondary sm:size-24">
        <Image
          src={BLOG_AUTHOR.image}
          alt={BLOG_AUTHOR.name}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
          Автор
        </p>
        <h2 className="mt-1 font-display text-xl font-medium">
          {BLOG_AUTHOR.name}
        </h2>
        <p className="text-sm text-muted-foreground">{BLOG_AUTHOR.role}</p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          {BLOG_AUTHOR.bio}
        </p>
        <Link
          href={BLOG_AUTHOR.profileUrl}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground transition-colors hover:text-primary"
        >
          За Снежана и салона <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}
