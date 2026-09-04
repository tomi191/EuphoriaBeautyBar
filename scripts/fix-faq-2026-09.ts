/* eslint-disable no-console */
/**
 * Одит №7: публичният ЧЗВ идва от базата (`faq_items`), не от файла, и там
 * два отговора бяха остарели:
 *  1. „Как да запазя час" изобщо не споменаваше онлайн записването и пращаше
 *     хората към телефона — при 38 онлайн срещу 282 телефонни записа.
 *  2. Политиката за отказ казваше 24 часа, докато формата и имейлът казват 5.
 * Плюс: списъкът с марки изброяваше 7, а hero-то твърди 8 (липсваше GENOSYS).
 *
 * Пускане:  npx tsx scripts/fix-faq-2026-09.ts          (dry-run)
 *           npx tsx scripts/fix-faq-2026-09.ts --apply
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { siteConfig } from "../src/lib/site";

const APPLY = process.argv.includes("--apply");

/** Въпрос (точно съвпадение) → новият отговор. */
const REWRITES: Array<{ match: string; answer: string }> = [
  {
    match: "Как да запазя час?",
    answer:
      "Най-бързо онлайн от бутона „Запиши час“: виждаш свободните часове в реално време и получаваш потвърждение по имейл. Работи и класиката — телефон " +
      siteConfig.contact.phoneFormatted +
      ", Viber или на място в салона. Часовете за козметика се уговарят по телефон.",
  },
  {
    match: "Каква е политиката за отказ на час?",
    answer:
      "Кажи ни най-късно 5 часа преди часа. Най-бързо от линка в имейла с потвърждението, иначе по телефон. При по-късен отказ или неявяване начисляваме 50% от стойността на услугата.",
  },
  {
    match: "С какви продукти работите?",
    answer:
      "Само с професионални марки: " +
      siteConfig.brands.join(", ") +
      ". Купуваме ги от оторизирани дистрибутори за България.",
  },
];

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const rows = await db.query.faqItems.findMany();

  const plan = REWRITES.map((r) => {
    const row = rows.find((x) => x.question.trim() === r.match);
    return row && row.answer.trim() !== r.answer ? { row, answer: r.answer } : null;
  }).filter((x): x is { row: (typeof rows)[number]; answer: string } => x !== null);

  for (const p of plan) {
    console.log(`\n▸ ${p.row.question}`);
    console.log(`  БЕШЕ: ${p.row.answer}`);
    console.log(`  СТАВА: ${p.answer}`);
  }
  const missing = REWRITES.filter((r) => !rows.some((x) => x.question.trim() === r.match));
  for (const m of missing) console.log(`\n⚠ Въпрос не е намерен в базата: „${m.match}“`);
  console.log(`\nЗа промяна: ${plan.length} от ${rows.length} реда`);

  if (!APPLY) {
    console.log("DRY-RUN. Пусни с --apply, за да запише.");
    process.exit(0);
  }

  for (const p of plan) {
    await db.update(schema.faqItems).set({ answer: p.answer }).where(eq(schema.faqItems.id, p.row.id));
  }
  console.log(`✓ Обновени ${plan.length} реда. Началната страница се ревалидира при следващия deploy.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
