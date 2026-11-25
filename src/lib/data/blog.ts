export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // ISO
  /** Последна редакция (ISO) - за dateModified в schema; пада обратно към date. */
  updatedAt?: string;
  readingMinutes: number;
  cover?: string;
  /** Публичен URL на TTS озвучаването; null/undefined ако постът няма аудио. */
  audioUrl?: string | null;
  content: BlogBlock[];
}

export type BlogBlock =
  | { type: "p"; text: string }
  // faq: заглавието е въпрос; абзаците под него до следващото заглавие са отговорът (FAQPage).
  | { type: "h2"; text: string; faq?: boolean }
  | { type: "h3"; text: string; faq?: boolean }
  | { type: "quote"; text: string; author?: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; variant: "tip" | "info"; title: string; text: string }
  | { type: "image"; src: string; alt: string };

// Статичните blog постове са премахнати — съдържанието вече живее в БД
// (таблица `blogPosts`, status="published") и се чете през `blog-store.ts`
// (`getPublishedPosts` / `getPublishedPost`). Новите статии се генерират през AI.
// Тук остават само презентационните типове (`BlogPost`, `BlogBlock`), които се
// ползват от blog-store, post-renderer, markdown-to-blocks и generator.

/**
 * Въпросите и отговорите, които статията показва (заглавие с `faq: true` + абзаците под него до
 * следващото заглавие). От тях е FAQPage на статията, затова видимото и schema са едно и също.
 */
export function faqFromBlocks(blocks: BlogBlock[]): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  let current: { question: string; parts: string[] } | null = null;
  const flush = () => {
    if (current && current.parts.length > 0) out.push({ question: current.question, answer: current.parts.join(" ") });
    current = null;
  };
  for (const b of blocks) {
    if (b.type === "h2" || b.type === "h3") {
      flush();
      if (b.faq) current = { question: b.text, parts: [] };
    } else if (b.type === "p" && current) {
      current.parts.push(b.text);
    }
  }
  flush();
  return out;
}
