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
      className="w-full rounded border border-white/30 bg-foreground/70 px-1.5 py-1 text-[11px] text-background backdrop-blur focus-visible:outline-none disabled:opacity-60"
      aria-label="Изпълнител (портфолио)"
    >
      <option value="">— без портфолио —</option>
      {resources.map((r) => (
        <option key={r.id} value={r.id} className="text-foreground">
          {r.name}
        </option>
      ))}
    </select>
  );
}
