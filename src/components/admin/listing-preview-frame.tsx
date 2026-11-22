"use client";

import * as React from "react";
import { ListingView, type ListingViewData } from "@/components/rental/listing-view";

export const PREVIEW_MESSAGE = "listing-preview";
export const PREVIEW_READY = "listing-preview-ready";

/** Вътре в прозореца на прегледа: рисува обявата с данните, които формата праща. */
export function ListingPreviewFrame() {
  const [data, setData] = React.useState<ListingViewData | null>(null);

  React.useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === PREVIEW_MESSAGE && e.data.data) setData(e.data.data as ListingViewData);
    }
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!data) return null;
  // Прегледът само се гледа: бутоните на обявата не се натискат оттук.
  return (
    <div className="pointer-events-none select-none" inert>
      <ListingView data={data} />
    </div>
  );
}
