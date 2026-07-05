interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

// U+2028/U+2029 са валидни в JSON, но са line terminator-и в JS → счупват inline
// <script>. Escape-ваме ги (и <>& за <script> breakout). new RegExp с ASCII низ,
// защото литерален U+2028 в regex literal сам би прекъснал реда.
const SEP = new RegExp("[\\u2028\\u2029]", "g");

/**
 * Сериализира за вграждане в <script>: без escape AI-генерирано blog заглавие/
 * описание (недоверен OpenRouter output в базата), съдържащо `</script>`, би излязло
 * от ld+json блока → stored XSS.
 */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/[<>&]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    .replace(SEP, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

export function JsonLd({ data }: JsonLdProps) {
  // Масив → отделен <script> за всеки обект. Гол JSON масив на top-level не е
  // валиден JSON-LD за Google Rich Results; отделните script-ове са.
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(item) }}
        />
      ))}
    </>
  );
}
