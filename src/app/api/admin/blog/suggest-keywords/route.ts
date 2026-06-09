/**
 * POST /api/admin/blog/suggest-keywords
 *
 * Приема topic от admin form-а и връща SEO-friendly ключови думи на български
 * за подаване в keywords полето на blog generator-а. Така admin пише само
 * темата, а AI извежда реалните търсения (напр. „балаяж варна цена").
 *
 * Lightweight Gemini Flash call с deterministic JSON. На грешка връща ясно
 * съобщение; UI fallback-ва към ръчно въвеждане.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/actions/auth-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `Ти си SEO специалист за Euphoria Hair & Beauty Bar — салон за красота в кв. Левски, Варна (коса, боядисване, балаяж, кератинови терапии, маникюр, педикюр, козметика/грижа за кожата).

ЗАДАЧА: От подадена ТЕМА генерирай 6-8 SEO ключови думи на български, които реални жени от Варна и региона действително търсят в Google. Първата = primary (най-важна, най-търсена), останалите = secondary/long-tail.

ПРАВИЛА:
- Реални търсения, не общи думи. Пример за тема „балаяж": "балаяж варна", "балаяж цена", "балаяж коса", "балаяж поддръжка", "балаяж кратка коса".
- Включи поне 1 локален keyword с „варна" където има локален интент (процедура, която се търси в салон).
- Включи поне 1 ценови/intent keyword където е уместно ("цена", "колко струва", "поддръжка", "колко издържа").
- Може марки, които салонът ползва (Montibello, Goldwell, Nashi Argan, GIGI), ако темата ги засяга.
- Избягвай too generic ("красота", "коса"). Long-tail е по-ценно.
- БЕЗ английски (българската аудитория търси на кирилица). Изключение: имена на марки.

ФОРМАТ — върни СТРОГО JSON, нищо друго:
{
  "keywords": ["primary keyword", "secondary 1", "secondary 2", ...]
}`;

export async function POST(req: Request) {
  await requireAdmin();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY не е зададен." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { topic?: string };
  const topic = body.topic?.trim();
  if (!topic || topic.length < 3) {
    return NextResponse.json(
      { error: "Темата трябва да е поне 3 символа." },
      { status: 400 },
    );
  }

  const model = process.env.BLOG_OPENROUTER_MODEL || "google/gemini-3.5-flash";

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://euphoriabeauty.eu",
        "X-Title": "Euphoria keyword suggester",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `ТЕМА: ${topic}` },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: `OpenRouter HTTP ${resp.status}: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content ?? "";

    let parsed: { keywords?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI върна невалиден JSON." },
        { status: 502 },
      );
    }

    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter(
          (k): k is string => typeof k === "string" && k.trim().length > 0,
        )
      : [];

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: "AI не върна нито една ключова дума." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, keywords: keywords.slice(0, 8) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Грешка при предложение: ${msg}` },
      { status: 500 },
    );
  }
}
