/**
 * Robust JSON parser за отговори от AI модели.
 * Три стратегии за поправка: direct → escape на control chars → regex fallback.
 * Пренесен as-is от peptidlabs — доказан срещу Gemini + Claude отговори.
 */

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

  // Стратегия 1: директно
  try {
    const out = JSON.parse(clean) as T;
    requireFields(out, requiredFields);
    return out;
  } catch {
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
  } catch {
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
  } catch {
    /* nothing */
  }

  throw new Error(`Could not parse AI response. Preview: ${clean.slice(0, 200)}`);
}

function requireFields(o: Record<string, unknown>, fields: string[]) {
  for (const f of fields) {
    if (o[f] === undefined || o[f] === null) {
      throw new Error(`Missing required field: ${f}`);
    }
  }
}
