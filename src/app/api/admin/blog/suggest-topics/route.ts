/**
 * POST /api/admin/blog/suggest-topics
 *
 * AI-генерирани предложения за блог теми, основани на:
 *   - Услугите на салона (коса/боядисване/балаяж/терапии/маникюр/козметика)
 *   - Какво реално търсят клиентите във Варна (SEO/тренд)
 *   - Сезонност (текущ месец)
 *   - Съществуващите статии (за избягване на дубликати)
 *
 * Връща 5-6 теми с обосновка + предложени ключови думи. Admin не трябва
 * да brainstorm-ва сам — клик върху тема я попълва във формата.
 *
 * Delimited формат (не JSON) — по-надежден за дълъг brainstorm output.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Suggestion {
  topic: string;
  keywords: string[];
  rationale: string;
  searchIntent: string;
}

const MONTHS = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
] as const;

export async function POST(req: Request) {
  await requireAdmin();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не е зададен." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    category?: string;
    count?: number;
  };
  const category = body.category?.trim() || "всички услуги";
  const count = Math.min(Math.max(body.count ?? 6, 3), 8);

  // Съществуващи теми (draft + published) — за да не предлагаме дубликати.
  const existing = await db.query.blogPosts.findMany({
    columns: { title: true },
    limit: 40,
  });
  const existingTitles = existing.map((p) => `- ${p.title}`).join("\n");

  const month = MONTHS[new Date().getMonth()];
  const year = new Date().getFullYear();
  const model = process.env.BLOG_OPENROUTER_MODEL || "google/gemini-3.5-flash";

  const systemPrompt = `Ти си content strategist за Euphoria Hair & Beauty Bar — салон за красота в кв. Левски, Варна.

УСЛУГИ НА САЛОНА (само от тях извеждай теми):
- Коса: подстригване, оформяне, прически
- Боядисване: балаяж, омбре, кичури, тониране, естествен цвят
- Фризьорски терапии: кератинова терапия, ботокс за коса, дълбока хидратация, минерална/ламеларна грижа
- Маникюр и педикюр: класически, гел лак, изграждане под форма, грижа за ноктите
- Козметика: лицеви терапии, почистване, хидратация, грижа за кожата
- Марки в салона: Montibello, Goldwell Kerasilk, Nashi Argan, GIGI

ЗАДАЧА: Предложи ${count} конкретни блог теми, които РЕАЛНО ще се търсят от жени във Варна и региона. Не общи теми — конкретни наслови с практически hook (как, кога, колко, цена, поддръжка, у дома).

КОНТЕКСТ:
- Месец: ${month} ${year} (отрази сезонността: лято = слънце/солена вода/изсветляване; есен = възстановяване след лято; зима = сухота/статично; пролет = обновяване)
- Категория интерес: ${category}

СЪЩЕСТВУВАЩИ СТАТИИ (НЕ предлагай тема, която вече я имаме):
${existingTitles || "(още няма статии)"}

КАКВО ТЪРСЯТ ХОРАТА (тренд/SEO примери):
- "балаяж колко издържа", "балаяж поддръжка у дома", "кератинова терапия цена варна"
- "как да възстановя коса след лято", "коса пада след боядисване"
- "гел лак или класически маникюр", "колко често гел лак"
- "грижа за кожата след 30", "почистване на лице колко често"
- "как да запазя цвета на косата по-дълго"

ЗАБРАНЕНО:
- Никакви медицински твърдения ("лекува", "премахва завинаги").
- Никакви фалшиви обещания за чудеса.
- Никакъв AI-slop в заглавията ("в дигиталната ера", "не просто X, а Y", суперлативи).

ФОРМАТ — върни СТРИКТНО delimited (БЕЗ JSON):

===SUGGESTION_1===
TOPIC: <заглавие на български, точно както би стояло в title полето>
KEYWORDS: <5-7 ключови думи на български, разделени със запетая, primary първа>
RATIONALE: <1 изречение защо темата ще се търси и колко конкурентна е>
INTENT: <един от: educational / comparison / how-to / seasonal / curiosity>
===END_SUGGESTION_1===

... (повтори за всички ${count} предложения, до ===SUGGESTION_${count}=== / ===END_SUGGESTION_${count}===)`;

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://euphoriabeauty.eu",
        "X-Title": "Euphoria topic suggester",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `OpenRouter недостъпен: ${err instanceof Error ? err.message : err}` },
      { status: 502 },
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return NextResponse.json(
      { error: `OpenRouter ${response.status}: ${errText.slice(0, 300)}` },
      { status: 502 },
    );
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  if (!raw) {
    return NextResponse.json({ error: "Празен отговор от AI." }, { status: 502 });
  }

  // Parse delimited секции — устойчиво на partial output / extra whitespace.
  const suggestions: Suggestion[] = [];
  for (let i = 1; i <= count; i++) {
    const re = new RegExp(
      `===SUGGESTION_${i}===\\s*([\\s\\S]*?)\\s*===END_SUGGESTION_${i}===`,
      "i",
    );
    const m = raw.match(re);
    if (!m) continue;
    const block = m[1];
    const topic = block.match(/TOPIC:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
    const keywordsStr = block.match(/KEYWORDS:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
    const rationale = block.match(/RATIONALE:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
    const intent = block.match(/INTENT:\s*(.+?)(?:\n|$)/i)?.[1]?.trim();
    if (!topic || !keywordsStr) continue;
    suggestions.push({
      topic,
      keywords: keywordsStr.split(/,/).map((k) => k.trim()).filter(Boolean),
      rationale: rationale ?? "",
      searchIntent: intent ?? "educational",
    });
  }

  if (suggestions.length === 0) {
    return NextResponse.json(
      { error: `Не успях да извлека предложения. Първи 500 знака: ${raw.slice(0, 500)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    suggestions,
    month,
    category,
    count: suggestions.length,
  });
}
