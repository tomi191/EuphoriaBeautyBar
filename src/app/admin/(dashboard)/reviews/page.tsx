import { CheckCircle2, Star, Unplug } from "lucide-react";
import { db } from "@/lib/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { SyncReviewsButton } from "@/components/admin/sync-reviews-button";
import { AddGoogleReviewForm } from "@/components/admin/add-google-review-form";
import { deleteGoogleReview, disconnectGoogleBusiness } from "@/lib/actions/google-reviews";
import { getConnection, oauthConfigured } from "@/lib/google-oauth";

const OAUTH_ERRORS: Record<string, string> = {
  "not-configured": "Липсват GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET в env.",
  "invalid-state": "Сесията на свързването изтече — опитай пак.",
  "no-refresh-token": "Google не върна refresh token — опитай пак (ще поиска съгласие наново).",
  "exchange-failed": "Свързването се провали — провери дали Business Profile API е одобрен за проекта.",
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; oauth_error?: string }>;
}) {
  const sp = await searchParams;
  const [reviews, connection] = await Promise.all([
    db.query.googleReviews.findMany({ orderBy: (r, { desc }) => [desc(r.publishedAt)] }),
    getConnection(),
  ]);
  const hasApiKey = !!process.env.GOOGLE_PLACES_API_KEY && !!process.env.GOOGLE_PLACE_ID;
  const hasSource = !!connection || hasApiKey;
  const dateFmt = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title="Google ревюта"
        subtitle="Отзиви от Google профила на салона — през Google връзка, Places API или въведени ръчно."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AddGoogleReviewForm />
            {!connection && oauthConfigured() && (
              <Button asChild variant="outline">
                <a href="/api/google/oauth/start">Свържи с Google</a>
              </Button>
            )}
            {hasSource && <SyncReviewsButton />}
          </div>
        }
      />

      {sp.connected && (
        <Alert className="mb-6 border-mint/40 bg-mint/15">
          <AlertTitle className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4" /> Google профилът е свързан
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            Натисни „Синхронизирай“, за да изтеглиш всички отзиви.
          </AlertDescription>
        </Alert>
      )}
      {sp.oauth_error && (
        <Alert className="mb-6 border-destructive/40 bg-destructive/10">
          <AlertTitle className="font-medium">Свързването не успя</AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {OAUTH_ERRORS[sp.oauth_error] ?? "Непознат проблем — виж сървърните логове."}
          </AlertDescription>
        </Alert>
      )}

      {connection && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="secondary" className="rounded-full bg-mint/30">Google свързан</Badge>
            <span className="text-muted-foreground">
              {connection.locationTitle || connection.locationName} · от{" "}
              {dateFmt.format(new Date(connection.connectedAt))}
            </span>
          </div>
          <form action={disconnectGoogleBusiness}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Unplug className="size-3.5" /> Изключи
            </Button>
          </form>
        </div>
      )}

      {!hasSource && (
        <Alert className="mb-6 border-mint/40 bg-mint/15">
          <AlertTitle className="font-medium">Как се добавят отзиви</AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            <p>
              <strong>Веднага (безплатно):</strong> копирай отзив от{" "}
              <a className="text-primary hover:underline" target="_blank" rel="noopener" href="https://www.google.com/maps/place/?q=place_id:ChIJAadCMDVVpEAR15dn6Gh-2U4">Google профила на салона</a>{" "}
              и го въведи с „Добави ръчно“.
            </p>
            <p className="mt-3">
              <strong>Автоматично (безплатно, като WP плъгин):</strong> Google Business Profile API — еднократно:
              GCP проект (без billing) + одобрение на достъпа от Google + OAuth client. После env
              <code className="mx-1">GOOGLE_OAUTH_CLIENT_ID</code>+<code className="mx-1">GOOGLE_OAUTH_CLIENT_SECRET</code>
              и тук се появява бутон „Свържи с Google“ — логваш се с акаунта-собственик и теглим всички отзиви.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background p-12 text-center text-muted-foreground">
            Няма отзиви. Добави ръчно или натисни &quot;Синхронизирай&quot;.
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
                      <p className="font-medium">
                        {r.authorName}
                        {r.id.startsWith("manual-") && (
                          <span className="ml-2 text-xs text-muted-foreground">· ръчно добавен</span>
                        )}
                      </p>
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
