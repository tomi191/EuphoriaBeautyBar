import { db } from "@/lib/db";
import { faqItems as fallbackFaq, type FAQItem } from "@/lib/data/faq";

/**
 * Публичният ЧЗВ идва от базата — админът го редактира на /admin/faq и промяната
 * стига до сайта (server action-ите правят revalidatePath("/")). Статичният faq.ts
 * остава fallback: при недостъпна БД началната показва въпроси вместо празен
 * accordion, а FAQPage schema не изчезва от SERP.
 *
 * Живее в отделен файл, а НЕ в faq.ts: `@/lib/db` хвърля при import без
 * DATABASE_URL, а faq.ts се чете и от модули, които се компилират без база.
 */
export async function getFaqItems(): Promise<FAQItem[]> {
  try {
    const rows = await db.query.faqItems.findMany({
      where: (f, { eq }) => eq(f.active, true),
      orderBy: (f, { asc }) => [asc(f.sortOrder)],
    });
    return rows.length ? rows.map(({ question, answer }) => ({ question, answer })) : fallbackFaq;
  } catch {
    return fallbackFaq;
  }
}
