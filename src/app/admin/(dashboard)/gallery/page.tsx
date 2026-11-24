import Link from "next/link";
import { db } from "@/lib/db";
import { listPublicGalleryImages } from "@/lib/data/public-gallery";
import { loadGalleryReview, type ReviewCard } from "@/lib/gallery/review";
import { approvedCount, pendingCount } from "@/lib/gallery/review-text";
import { getAdminChatId } from "@/lib/telegram";
import { GalleryImageCard } from "@/components/admin/gallery-image-card";
import { GalleryReviewCard } from "@/components/admin/gallery-review-card";
import { GalleryUploadToggle } from "@/components/admin/gallery-upload-toggle";

export const dynamic = "force-dynamic";

type Tab = "pending" | "site" | "rejected";
type SP = { tab?: string; edit?: string; reject?: string };

const TAB_FOR: Record<ReviewCard["status"], Tab> = { pending: "pending", approved: "site", rejected: "rejected" };

/**
 * Галерията при Снежана (№8 В3, кадри «В-админ-1440» и «В-одобрение-390»): «Чакат одобрение»,
 * «В галерията» (снимките от специалистите и нейните), «Върнати». ?edit=<id> и ?reject=<id> идват
 * от бутоните в Telegram и отварят картата с полето.
 */
export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [review, images, resources, tgChat] = await Promise.all([
    loadGalleryReview(),
    listPublicGalleryImages(),
    db.query.resources.findMany({
      where: (r, { eq }) => eq(r.active, true),
      orderBy: (r, { asc }) => [asc(r.sortOrder)],
    }),
    getAdminChatId(),
  ]);

  const focusId = sp.edit ?? sp.reject;
  const focus = focusId ? [...review.pending, ...review.approved, ...review.rejected].find((c) => c.id === focusId) : undefined;
  const tab: Tab = focus ? TAB_FOR[focus.status] : sp.tab === "site" || sp.tab === "rejected" ? sp.tab : "pending";
  const initialFor = (id: string): "edit" | "reject" | undefined =>
    id !== focusId ? undefined : sp.edit ? "edit" : focus?.status === "pending" ? "reject" : undefined;

  const own = images.filter((i) => !i.uploadedBy);
  const resOpts = resources.map((r) => ({ id: r.id, name: r.name }));
  const n = review.pending.length;

  return (
    <>
      {/* Като PageHeader, но бутонът е до заглавието (кадърът), не до долния ред. */}
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium md:text-4xl">Галерия</h1>
          <p className="mt-2 text-muted-foreground">Снимките на сайта. Специалистите качват свои, ти решаваш кои излизат.</p>
        </div>
        <GalleryUploadToggle className="hidden lg:inline-flex" />
      </header>

      <nav aria-label="Раздели" className="-mx-4 -mt-3 mb-3 flex gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:mb-4 lg:mt-0 lg:gap-3 lg:px-0">
        <TabPill active={tab === "pending"} href="/admin/gallery">
          {n > 0 ? `Чакат одобрение · ${n}` : "Чакат одобрение"}
        </TabPill>
        <TabPill active={tab === "site"} href="/admin/gallery?tab=site">
          В галерията
        </TabPill>
        <TabPill active={tab === "rejected"} href="/admin/gallery?tab=rejected">
          Върнати
        </TabPill>
      </nav>

      {tab === "pending" && (
        <>
          {!tgChat && (
            <p className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-[15px] text-muted-foreground lg:max-w-[54rem] lg:text-sm">
              Telegram не е свързан: новите снимки идват само тук и в камбанката.{" "}
              <Link href="/admin/settings" className="font-medium text-foreground underline underline-offset-4">
                Свържи го в Настройки
              </Link>
            </p>
          )}
          {n === 0 ? (
            <Empty>Няма снимки за одобрение. Когато специалист качи, ще получиш съобщение в Telegram и ще я видиш тук.</Empty>
          ) : (
            <>
              <h2 className="mb-4 hidden font-sans text-[1.625rem] font-semibold tracking-tight lg:block">{pendingCount(n)}</h2>
              <Cards cards={review.pending} initialFor={initialFor} />
            </>
          )}
        </>
      )}

      {tab === "site" && (
        <>
          {review.approved.length === 0 ? (
            <Empty>Още няма снимки от специалистите. Одобрените излизат тук и на сайта.</Empty>
          ) : (
            <>
              <h2 className="mb-4 font-sans text-[1.625rem] font-semibold tracking-tight">{approvedCount(review.approved.length)}</h2>
              <Cards cards={review.approved} initialFor={initialFor} />
            </>
          )}

          <div className="mb-4 mt-10 flex items-end justify-between gap-4">
            <h2 className="font-sans text-[1.625rem] font-semibold tracking-tight">Качени от теб · {own.length}</h2>
            <GalleryUploadToggle className="lg:hidden" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {own.map((img) => (
              <GalleryImageCard
                key={img.id}
                image={{
                  id: img.id,
                  src: img.src,
                  alt: img.alt,
                  category: img.category,
                  description: img.description,
                  resourceId: img.resourceId,
                }}
                resources={resOpts}
              />
            ))}
          </div>
        </>
      )}

      {tab === "rejected" &&
        (review.rejected.length === 0 ? (
          <Empty>Нищо не е върнато. Върнатите снимки стоят тук с причината.</Empty>
        ) : (
          <>
            <h2 className="mb-4 font-sans text-[1.625rem] font-semibold tracking-tight">{review.rejected.length} върнати</h2>
            <Cards cards={review.rejected} initialFor={initialFor} />
          </>
        ))}
    </>
  );
}

function Cards({ cards, initialFor }: { cards: ReviewCard[]; initialFor: (id: string) => "edit" | "reject" | undefined }) {
  return (
    <div className="grid gap-4 lg:max-w-[54rem] lg:grid-cols-3">
      {cards.map((c) => (
        <GalleryReviewCard key={c.id} card={c} initial={initialFor(c.id)} />
      ))}
    </div>
  );
}

/** Хапче за раздел: видимо 40 px (36 на компютър), а мястото за докосване е 48 px. */
function TabPill({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="flex h-12 shrink-0 items-center">
      <span
        className={
          "inline-flex h-10 items-center whitespace-nowrap rounded-full border px-5 text-base lg:h-9 lg:px-[1.125rem] lg:text-[15px] " +
          (active ? "border-foreground bg-foreground font-medium text-background" : "border-border bg-background text-foreground hover:border-foreground/40")
        }
      >
        {children}
      </span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-card px-5 py-8 text-center text-[15px] leading-relaxed text-muted-foreground lg:max-w-[54rem]">
      {children}
    </p>
  );
}
