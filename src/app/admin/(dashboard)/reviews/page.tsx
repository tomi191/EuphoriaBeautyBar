import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { SyncReviewsButton } from "@/components/admin/sync-reviews-button";
import { deleteGoogleReview } from "@/lib/actions/google-reviews";

export default async function AdminReviewsPage() {
  const reviews = await db.query.googleReviews.findMany({
    orderBy: (r, { desc }) => [desc(r.publishedAt)],
  });
  const hasCredentials = !!process.env.GOOGLE_PLACES_API_KEY && !!process.env.GOOGLE_PLACE_ID;
  const dateFmt = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title="Google ревюта"
        subtitle="Реални отзиви от Google Business Profile, синхронизирани и кеширани в DB."
        action={<SyncReviewsButton />}
      />

      {!hasCredentials && (
        <Alert className="mb-6 border-mint/40 bg-mint/15">
          <AlertTitle className="font-medium">Нужна е настройка</AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            За да теглим реални Google ревюта, добави следните в <code>.env.local</code> и Vercel env:
            <ul className="mt-3 space-y-1 font-mono text-xs">
              <li>GOOGLE_PLACES_API_KEY=твоят_API_ключ</li>
              <li>GOOGLE_PLACE_ID=ChIJAadCMDVVpEAR15dn6Gh-2U4</li>
            </ul>
            <p className="mt-3">
              Place ID на салона е горният (намерен юни 2026). API ключ — в Google Cloud Console
              с активирано <em>Places API (New)</em>; ограничи ключа до този API.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background p-12 text-center text-muted-foreground">
            Няма синхронизирани ревюта. Натисни &quot;Синхронизирай&quot;.
          </div>
        ) : (
          reviews.map((r) => {
            const del = deleteGoogleReview.bind(null, r.id);
            return (
              <article key={r.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-mint font-medium">
                      {r.authorName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{r.authorName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="size-3.5 fill-foreground text-foreground" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{dateFmt.format(r.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <DeleteButton action={del} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/85">{r.text}</p>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
