"use client";

import * as React from "react";
import { toast } from "sonner";
import { setGalleryImageResource } from "@/lib/actions/gallery";

export function GalleryResourceTag({
  imageId,
  resourceId,
  resources,
}: {
  imageId: string;
  resourceId: string | null;
  resources: { id: string; name: string }[];
}) {
  const [value, setValue] = React.useState(resourceId ?? "");
  const [pending, setPending] = React.useState(false);

  async function onChange(next: string) {
    setValue(next);
    setPending(true);
    try {
      await setGalleryImageResource(imageId, next || null);
      toast.success(next ? "Снимката е добавена към портфолиото." : "Снимката е премахната от портфолио.");
    } catch {
      toast.error("Грешка при запазване.");
      setValue(resourceId ?? "");
    } finally {
      setPending(false);
    }
  }

  if (resources.length === 0) return null;

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      aria-label="Изпълнител (портфолио)"
    >
      <option value="">— без портфолио —</option>
      {resources.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
