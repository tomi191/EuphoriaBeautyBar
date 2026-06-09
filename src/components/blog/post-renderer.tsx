import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lightbulb, Info } from "lucide-react";
import type { BlogBlock } from "@/lib/data/blog";

/**
 * Inline markdown парсер за тялото на параграфи и списъчни елементи.
 * Поддържа линкове [текст](url) и удебеляване **текст** и връща React
 * фрагменти. Вътрешните линкове (URL започва с „/“) се рендират като
 * next/link <Link>; евентуални външни (http) като <a target="_blank">.
 * Целта е internal linking към страниците с услуги (SEO).
 */
const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  // Регулярният израз е global; нулираме за всеки вход.
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>,
      );
    }

    const [, linkLabel, linkHref, boldText] = match;
    if (linkHref !== undefined && linkLabel !== undefined) {
      const isInternal = linkHref.startsWith("/");
      if (isInternal) {
        nodes.push(
          <Link
            key={key++}
            href={linkHref}
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {linkLabel}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={key++}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {linkLabel}
          </a>,
        );
      }
    } else if (boldText !== undefined) {
      nodes.push(<strong key={key++}>{boldText}</strong>);
    }

    lastIndex = INLINE_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  // Ако няма съвпадения, връщаме чистия текст.
  return nodes.length > 0 ? nodes : text;
}

export function PostRenderer({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i} className="text-lg leading-relaxed text-foreground/85">
                {renderInline(block.text)}
              </p>
            );
          case "h2":
            return (
              <h2 key={i} className="mt-12 font-display text-3xl font-medium md:text-4xl">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-8 font-display text-2xl font-medium">
                {block.text}
              </h3>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="my-10 border-l-2 border-primary py-2 pl-6 font-serif text-2xl leading-relaxed italic text-foreground"
              >
                “{block.text}”
                {block.author && (
                  <footer className="mt-3 text-sm font-sans text-muted-foreground not-italic">
                    — {block.author}
                  </footer>
                )}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i} className="space-y-2">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-lg leading-relaxed text-foreground/85">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={i} className="my-10">
                <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-border bg-secondary">
                  <Image
                    src={block.src}
                    alt={block.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                  />
                </div>
                {block.alt && (
                  <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );
          case "callout":
            const Icon = block.variant === "tip" ? Lightbulb : Info;
            return (
              <aside
                key={i}
                className="my-8 flex gap-4 rounded-2xl border border-primary/20 bg-secondary/40 p-6"
              >
                <Icon className="size-5 shrink-0 text-primary" strokeWidth={1.6} />
                <div>
                  <p className="font-medium text-foreground">{block.title}</p>
                  {block.text && <p className="mt-1 text-base text-muted-foreground">{block.text}</p>}
                </div>
              </aside>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
