/**
 * Батерия за bot engine-а срещу ЖИВИЯ контекст (каталог/FAQ/наем от БД).
 * Проверява интент + наличие на очакван линк за ~16 реални въпроса.
 * Пускане: npx dotenv-cli -e .env.local -- npx tsx scripts/test-bot-engine.ts
 */
import { db } from "../src/lib/db";
import { getServiceCatalog } from "../src/lib/data/service-catalog";
import { getFaqItems } from "../src/lib/data/faq-db";
import { answerQuestion, type BotContext, type BotService } from "../src/lib/bot/engine";

async function buildContext(): Promise<BotContext> {
  const [catalog, faq, positions, rentalOpenRow] = await Promise.all([
    getServiceCatalog(),
    getFaqItems().catch(() => []),
    db.query.rentalPositions.findMany({ where: (p, { eq }) => eq(p.active, true), columns: { title: true } }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "rental_open") }),
  ]);
  const services: BotService[] = catalog.flatMap((c) =>
    c.groups.flatMap((g) =>
      g.items.map((i) => ({
        name: i.name, price: i.price, priceMax: i.priceMax, priceFrom: i.priceFrom ?? false,
        currency: i.currency, group: g.title, categorySlug: c.slug, categoryTitle: c.title,
      })),
    ),
  );
  return {
    services,
    faq: faq.map((f) => ({ question: f.question, answer: f.answer })),
    rentalOpen: rentalOpenRow ? Boolean(rentalOpenRow.value) : true,
    positions,
  };
}

interface Case {
  q: string;
  intent: string | string[];
  linkIncludes?: string;
  textIncludes?: string;
}

const CASES: Case[] = [
  { q: "Здравей!", intent: "greeting" },
  { q: "Цени и услуги", intent: "overview", linkIncludes: "/uslugi/frizorski-uslugi" },
  { q: "балеаж цена", intent: "service", linkIncludes: "/uslugi/balayazh-varna" },
  { q: "колко струва боядисване на дълга коса", intent: "service", linkIncludes: "/uslugi/boyadisvane-na-kosa-varna" },
  { q: "кичури", intent: "service", linkIncludes: "/uslugi/kichuri-varna" },
  { q: "manikur s gel lak", intent: "service", textIncludes: "гел лак" },
  { q: "медицински педикюр", intent: "service", linkIncludes: "/uslugi/manikyur-i-pedikyur" },
  { q: "кола маска цели крака колко е", intent: "service", linkIncludes: "/uslugi/kola-maska-varna" },
  { q: "ламиниране на мигли", intent: "service", linkIncludes: "/uslugi/vezhdi-i-migli-varna" },
  { q: "Запази час", intent: ["booking", "service"], linkIncludes: "/zapazi-chas" },
  { q: "Работно време", intent: "hours", textIncludes: "09:00" },
  { q: "Къде се намирате?", intent: "location", textIncludes: "Петър Райчев" },
  { q: "Как се плаща, с карта може ли", intent: "payment", textIncludes: "Revolut" },
  { q: "Работа при вас", intent: "careers", linkIncludes: "/karieri" },
  { q: "имате ли стол под наем за фризьор", intent: "careers", linkIncludes: "/karieri" },
  { q: "искам да говоря с човек", intent: "contact", linkIncludes: "tel:" },
  { q: "asdf qwerty 123", intent: "fallback" },
];

async function main() {
  const ctx = await buildContext();
  console.log(`Контекст: ${ctx.services.length} услуги, ${ctx.faq.length} FAQ, наем открит: ${ctx.rentalOpen}, позиции: ${ctx.positions.length}\n`);

  let pass = 0;
  let fail = 0;
  for (const c of CASES) {
    const r = answerQuestion(c.q, ctx);
    const intents = Array.isArray(c.intent) ? c.intent : [c.intent];
    const okIntent = intents.includes(r.intent);
    const okLink = !c.linkIncludes || (r.links ?? []).some((l) => l.href.includes(c.linkIncludes!));
    const okText = !c.textIncludes || r.text.toLowerCase().includes(c.textIncludes.toLowerCase());
    const ok = okIntent && okLink && okText;
    if (ok) pass++;
    else fail++;
    console.log(`${ok ? "✅" : "❌"} „${c.q}" → ${r.intent}${okLink ? "" : ` (липсва линк ${c.linkIncludes})`}${okText ? "" : ` (липсва текст ${c.textIncludes})`}`);
    if (!ok) console.log(`   ↳ ${r.text.slice(0, 120)} | links: ${(r.links ?? []).map((l) => l.href).join(", ")}`);
  }
  console.log(`\n${pass}/${CASES.length} минаха`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
