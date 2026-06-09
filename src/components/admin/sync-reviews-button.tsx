"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncGoogleReviews } from "@/lib/actions/google-reviews";

export function SyncReviewsButton() {
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await syncGoogleReviews();
      if (result.ok === true) {
        const count = result.count ?? 0;
        const rating = result.rating ?? 0;
        const total = result.total ?? 0;
        toast.success(`Синхронизирани ${count} ревюта · среден рейтинг ${rating.toFixed(1)} (${total} общо).`);
      } else {
        toast.error("Липсват GOOGLE_PLACES_API_KEY и GOOGLE_PLACE_ID в .env.");
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} className="bg-foreground text-background hover:bg-foreground/90">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      Синхронизирай
    </Button>
  );
}
