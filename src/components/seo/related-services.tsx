import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { relatedLandings } from "@/lib/seo/related-links";

/**
 * „Свързани услуги" под тялото на статията: 1–3 landing страници по тема.
 * Server component, без клиентски JS. Вътрешните линкове дават на landing
 * страниците тежест от статията, която реално води трафик.
 */
export function RelatedServices({ post }: { post: { slug: string; title: string } }) {
  const links = relatedLandings(post);
  return (
    <aside aria-labelledby="related-services" className="mt-12 rounded-2xl border border-border/60 bg-secondary/30 p-6 md:p-8">
      <h2 id="related-services" className="font-display text-2xl font-medium">
        Свързани услуги
      </h2>
      <ul className="mt-5 space-y-4">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="group inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary">
              {l.title}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-0.5 text-sm text-muted-foreground">{l.reason}</p>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 h-11 rounded-full px-6">
        <Link href="/zapazi-chas">
          <Calendar className="size-4" /> Запази час
        </Link>
      </Button>
    </aside>
  );
}
