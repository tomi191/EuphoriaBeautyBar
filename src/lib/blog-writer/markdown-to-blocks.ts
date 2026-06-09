/**
 * Markdown → BlogBlock[] конвертор.
 *
 * Моделът връща контента като markdown (по-естествен формат за писане),
 * но Euphoria рендира блог постовете от typed блокове (виж
 * src/lib/data/blog.ts + src/components/blog/post-renderer.tsx).
 * Този конвертор превежда markdown в точния масив от блокове, който
 * PostRenderer разбира — иначе постът няма да се рендира коректно.
 *
 * Поддържани блокове (огледало на BlogBlock union-а):
 *   { type: "p"; text }
 *   { type: "h2"; text }
 *   { type: "h3"; text }
 *   { type: "quote"; text; author? }
 *   { type: "list"; items[] }
 *   { type: "callout"; variant: "tip" | "info"; title; text }
 *   { type: "image"; src; alt }
 */

import type { BlogBlock } from "@/lib/data/blog";

/** Самостоятелен ред-изображение: ![alt](url). Хваща и празен alt. */
const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

/** Сваля inline markdown маркъри (bold/italic/code/links) до чист текст. */
function stripInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // изображения
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // линкове → анкер текст
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/`([^`]+)`/g, "$1") // inline code
    .trim();
}

/**
 * Разпознава callout евристично. Моделът е инструктиран да маркира
 * съветите с префикс "Съвет:" / "Важно:" в blockquote или параграф.
 * variant "tip" за съвети, "info" за всичко друго.
 */
function parseCallout(
  rawTitle: string,
  body: string,
): BlogBlock | null {
  const tipMatch = /^(съвет|tip|съвет от майстора|про съвет)\b[:：]?\s*/i;
  const infoMatch = /^(важно|info|внимание|забележка|бонус)\b[:：]?\s*/i;
  if (tipMatch.test(rawTitle)) {
    return {
      type: "callout",
      variant: "tip",
      title: rawTitle.replace(tipMatch, "").trim() || "Съвет от майстора",
      text: body,
    };
  }
  if (infoMatch.test(rawTitle)) {
    return {
      type: "callout",
      variant: "info",
      title: rawTitle.replace(infoMatch, "").trim() || "Важно",
      text: body,
    };
  }
  return null;
}

export function markdownToBlocks(markdown: string): BlogBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlogBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Празни редове — пропускай
    if (trimmed === "") {
      i++;
      continue;
    }

    // Неразрешен placeholder за изображение (KIE липсва/fail) — пропускай тихо,
    // за да не остане суров HTML коментар в тялото.
    if (/^<!--\s*image:[\s\S]*?-->$/.test(trimmed)) {
      i++;
      continue;
    }

    // Самостоятелно inline изображение: ![alt](url)
    const img = trimmed.match(IMAGE_LINE_RE);
    if (img) {
      blocks.push({ type: "image", src: img[2], alt: stripInline(img[1]) });
      i++;
      continue;
    }

    // Заглавия
    const h2 = trimmed.match(/^##\s+(.*)$/);
    const h3 = trimmed.match(/^###+\s+(.*)$/);
    const h1 = trimmed.match(/^#\s+(.*)$/);
    if (h3) {
      blocks.push({ type: "h3", text: stripInline(h3[1]) });
      i++;
      continue;
    }
    if (h2) {
      blocks.push({ type: "h2", text: stripInline(h2[1]) });
      i++;
      continue;
    }
    if (h1) {
      // H1 е заглавието на статията — рендира се отделно, не в тялото.
      // Свеждаме до h2, за да не се губи съдържание ако моделът сложи H1 в body.
      blocks.push({ type: "h2", text: stripInline(h1[1]) });
      i++;
      continue;
    }

    // Blockquote — събира последователните "> ..." редове
    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      const joined = quoteLines.join(" ").trim();
      // Автор: "— Име" или "- Име" на края на цитата
      const authorMatch = joined.match(/[—-]\s*([^—-]+?)\s*$/);
      let text = joined;
      let author: string | undefined;
      // Цитираме автора само ако е кратко (име), не цяло изречение
      if (authorMatch && authorMatch[1].split(/\s+/).length <= 4) {
        author = stripInline(authorMatch[1]);
        text = joined.slice(0, authorMatch.index).trim();
      }
      // Ако цитатът е всъщност callout (Съвет:/Важно:)
      const callout = parseCallout(text, "");
      if (callout && callout.type === "callout") {
        blocks.push(callout);
      } else {
        blocks.push({ type: "quote", text: stripInline(text), ...(author ? { author } : {}) });
      }
      continue;
    }

    // Списък (- / * / + / номериран)
    if (/^([-*+]|\d+[.)])\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^([-*+]|\d+[.)])\s+/.test(lines[i].trim())) {
        items.push(stripInline(lines[i].trim().replace(/^([-*+]|\d+[.)])\s+/, "")));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Параграф — събира редове до празен ред или нов блок. Самостоятелен
    // image ред и placeholder коментар също прекъсват параграфа, за да се
    // рендират като отделен image блок, не да се слепят в текста.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s+|>\s?|([-*+]|\d+[.)])\s+)/.test(lines[i].trim()) &&
      !IMAGE_LINE_RE.test(lines[i].trim()) &&
      !/^<!--\s*image:[\s\S]*?-->$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    const paragraph = paraLines.join(" ").trim();
    if (!paragraph) continue;

    // Параграф, който започва със "Съвет:" / "Важно:" → callout
    const callout = parseCallout(paragraph, "");
    if (callout && callout.type === "callout") {
      // Раздели заглавие от тяло по първото изречение/двоеточие, ако има
      const colonSplit = paragraph.replace(/^(съвет|важно|tip|info|внимание|забележка|бонус|съвет от майстора|про съвет)\b[:：]?\s*/i, "");
      const firstSentence = colonSplit.match(/^(.+?[.!?])\s+(.+)$/s);
      if (firstSentence) {
        blocks.push({
          type: "callout",
          variant: callout.variant,
          title: stripInline(firstSentence[1].replace(/[.!?]\s*$/, "")),
          text: stripInline(firstSentence[2]),
        });
      } else {
        blocks.push({
          type: "callout",
          variant: callout.variant,
          title: callout.variant === "tip" ? "Съвет" : "Важно",
          text: stripInline(colonSplit),
        });
      }
      continue;
    }

    blocks.push({ type: "p", text: stripInline(paragraph) });
  }

  return blocks;
}
