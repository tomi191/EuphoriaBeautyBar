/**
 * Robust JSON parser за отговори от AI модели.
 * Три стратегии за поправка: direct → escape на control chars → regex fallback.
 * Пренесен as-is от peptidlabs — доказан срещу Gemini + Claude отговори.
 */

/**
 * Грешка „JSON-ът се парсна, но липсва задължително поле". Разграничава се от
 * fail при самото парсване, за да даде ясно съобщение нагоре по веригата.
 */
class MissingFieldError extends Error {
  constructor(public readonly field: string) {
    super(`Missing required field: ${field}`);
    this.name = "MissingFieldError";
  }
}

export function parseJSONResponse<T extends Record<string, unknown>>(
  raw: string,
  requiredFields: string[] = [],
): T {
  let clean = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  const m = clean.match(/\{[\s\S]*\}/);
  if (m) clean = m[0];

  // Пазим последната „липсващо поле" грешка отделно: ако JSON-ът се парсна
  // успешно, но дадено поле липсва, искаме точно това съобщение — не общото
  // „невалиден JSON", което подвежда диагнозата.
  let lastMissingField: MissingFieldError | null = null;

  // Стратегия 1: директно
  try {
    const out = JSON.parse(clean) as T;
    requireFields(out, requiredFields);
    return out;
  } catch (e) {
    if (e instanceof MissingFieldError) lastMissingField = e;
    /* fall through */
  }

  // Стратегия 2: escape на control chars в познати string полета
  try {
    let repaired = clean;
    const stringFields = [
      ...requiredFields,
      "title",
      "excerpt",
      "metaDescription",
      "content",
      "category",
    ];
    for (const f of stringFields) {
      const re = new RegExp(`"${f}":\\s*"([\\s\\S]*?)"(?=\\s*[,}])`, "g");
      repaired = repaired.replace(re, (_match, value: string) => {
        const escaped = value
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t")
          .replace(/[\x00-\x1F\x7F]/g, "");
        return `"${f}": "${escaped}"`;
      });
    }
    const out = JSON.parse(repaired) as T;
    requireFields(out, requiredFields);
    return out;
  } catch (e) {
    if (e instanceof MissingFieldError) lastMissingField = e;
    /* fall through */
  }

  // Стратегия 3: regex extract по поле (last-ditch). Escape-aware character
  // class — (?:\\.|[^"\\])* — за да не прекъсне match-а при единичен кавичка.
  try {
    const out: Record<string, unknown> = {};
    const escapeAware = `"((?:\\\\.|[^"\\\\])*)"`;
    for (const f of requiredFields) {
      const fm = clean.match(new RegExp(`"${f}":\\s*${escapeAware}`, "s"));
      if (fm) {
        out[f] = fm[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }
    }
    const tagsMatch = clean.match(/"tags":\s*\[([\s\S]*?)\]/);
    if (tagsMatch) {
      const items = tagsMatch[1].match(/"([^"]+)"/g);
      out.tags = items ? items.map((s) => s.replace(/"/g, "")) : [];
    }
    requireFields(out, requiredFields);
    return out as T;
  } catch (e) {
    if (e instanceof MissingFieldError) lastMissingField = e;
    /* nothing */
  }

  // Ако някоя стратегия е парснала валиден JSON, но е липсвало поле — дай
  // точната диагноза. Иначе наистина не успяхме да извлечем валиден JSON.
  if (lastMissingField) {
    throw new Error(
      `AI отговорът е валиден JSON, но липсва задължително поле "${lastMissingField.field}". Preview: ${clean.slice(0, 200)}`,
    );
  }

  throw new Error(
    `AI отговорът не е валиден JSON (вероятно отрязан или с грешен формат). Preview: ${clean.slice(0, 200)}`,
  );
}

function requireFields(o: Record<string, unknown>, fields: string[]) {
  for (const f of fields) {
    if (o[f] === undefined || o[f] === null) {
      throw new MissingFieldError(f);
    }
  }
}
