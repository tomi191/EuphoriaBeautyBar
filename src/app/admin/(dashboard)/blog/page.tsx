import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { BlogGenerateForm } from "@/components/admin/blog-generate-form";
import { PublishBlogButton } from "@/components/admin/publish-blog-button";

const dateFmt = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric" });

export default async function AdminBlogPage() {
  const posts = await db.query.blogPosts.findMany({
    orderBy: (p, { desc }) => [desc(p.publishedAt)],
  });

  return (
    <>
      <PageHeader
        title="Журнал"
        subtitle="Управление на статиите на сайта."
        action={
          <BlogGenerateForm
            trigger={
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Sparkles className="size-4" /> Генерирай с AI
              </Button>
            }
          />
        }
      />

      <div className="space-y-3">
        {posts.map((p) => (
          <article key={p.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-primary">{p.category}</p>
              <h3 className="mt-1 truncate font-display text-lg">{p.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateFmt.format(p.publishedAt)} · {p.readingMinutes} мин · <span className={p.status === "published" ? "text-foreground" : "text-destructive"}>{p.status}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PublishBlogButton id={p.id} status={p.status} />
              <Link
                href={p.status === "published" ? `/blog/${p.slug}` : `/admin/blog/preview/${p.slug}`}
                target="_blank"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                Виж <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
