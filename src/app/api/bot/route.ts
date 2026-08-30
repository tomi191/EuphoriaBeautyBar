import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { getFaqItems } from "@/lib/data/faq-db";
import { answerQuestion, type BotContext, type BotService } from "@/lib/bot/engine";

/**
 * Site bot API (без LLM) — виж docs/superpowers/specs/2026-08-30-site-bot-design.md.
 * Контекстът се чете на всяко искане от живите източници (каталог/FAQ/наем),
 * затова ботът никога не цитира стара цена. Логването е fire-and-forget.
 */
export const runtime = "nodejs";

const inputSchema = z.object({ message: z.string().min(1).max(500) });

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
        name: i.name,
        price: i.price,
        priceMax: i.priceMax,
        priceFrom: i.priceFrom ?? false,
        currency: i.currency,
        group: g.title,
        categorySlug: c.slug,
        categoryTitle: c.title,
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

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалиден JSON" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалидно съобщение" }, { status: 422 });
  }

  try {
    const ctx = await buildContext();
    const reply = answerQuestion(parsed.data.message, ctx);

    // Лог — никога не блокира/чупи отговора.
    db.insert(schema.botQueries)
      .values({
        id: nanoid(),
        message: parsed.data.message.slice(0, 500),
        intent: reply.intent,
        matched: reply.intent !== "fallback",
      })
      .catch(() => {});

    return NextResponse.json(reply);
  } catch (err) {
    console.error("[bot] грешка:", err);
    // Ботът никога не „виси": ескалация към каналите с човек.
    return NextResponse.json({
      intent: "error",
      text: "В момента нещо се обърка при мен. Обади се или пиши във Viber: там отговаря човек от салона.",
      links: [
        { label: "+359 898 66 33 15", href: "tel:+359898663315" },
        { label: "Пиши във Viber", href: "viber://chat?number=%2B359898663315" },
      ],
    });
  }
}
