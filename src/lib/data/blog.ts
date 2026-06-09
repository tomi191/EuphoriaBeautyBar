export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // ISO
  readingMinutes: number;
  cover?: string;
  content: BlogBlock[];
}

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string; author?: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; variant: "tip" | "info"; title: string; text: string }
  | { type: "image"; src: string; alt: string };

// Статичните blog постове са премахнати — съдържанието вече живее в БД
// (таблица `blogPosts`, status="published") и се чете през `blog-store.ts`
// (`getPublishedPosts` / `getPublishedPost`). Новите статии се генерират през AI.
// Тук остават само презентационните типове (`BlogPost`, `BlogBlock`), които се
// ползват от blog-store, post-renderer, markdown-to-blocks и generator.
