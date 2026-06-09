import Image from "next/image";
import { Lightbulb, Info } from "lucide-react";
import type { BlogBlock } from "@/lib/data/blog";

export function PostRenderer({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i} className="text-lg leading-relaxed text-foreground/85">
                {block.text}
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
                    <span>{item}</span>
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
