"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deleteGalleryImage, updateGalleryImageMeta } from "@/lib/actions/gallery";
import { GalleryResourceTag } from "@/components/admin/gallery-resource-tag";
import { galleryCategories } from "@/lib/data/gallery";

interface GalleryImageCardProps {
  image: {
    id: string;
    src: string;
    alt: string;
    category: string;
    description: string | null;
    resourceId: string | null;
  };
  resources: { id: string; name: string }[];
}

export function GalleryImageCard({ image, resources }: GalleryImageCardProps) {
  const [category, setCategory] = React.useState(image.category);
  const [description, setDescription] = React.useState(image.description ?? "");
  const [pending, setPending] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const confirmTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  async function onCategoryChange(next: string) {
    const prev = category;
    setCategory(next);
    setPending(true);
    try {
      const res = await updateGalleryImageMeta(image.id, { category: next });
      if (!res.ok) throw new Error(res.error);
      toast.success("Категорията е сменена.");
    } catch {
      toast.error("Грешка при запазване.");
      setCategory(prev);
    } finally {
      setPending(false);
    }
  }

  async function onDescriptionBlur() {
    const next = description.trim();
    if (next === (image.description ?? "")) return;
    setPending(true);
    try {
      const res = await updateGalleryImageMeta(image.id, { description: next || null });
      if (!res.ok) throw new Error(res.error);
      toast.success("Описанието е запазено.");
    } catch {
      toast.error("Грешка при запазване.");
      setDescription(image.description ?? "");
    } finally {
      setPending(false);
    }
  }

  // Двустъпково изтриване (клик → потвърди в 3 s) вместо window.confirm — modal
  // dialog-ите блокират браузър автоматизацията и са грозни в admin контекст.
  function onDeleteClick() {
    if (!confirming) {
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirming(false);
    void doDelete();
  }

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await deleteGalleryImage(image.id);
      if (!res.ok) throw new Error(res.error);
      toast.success("Снимката е изтрита от галерията.");
    } catch {
      toast.error("Грешка при изтриване.");
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-square bg-secondary">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />
        <button
          type="button"
          onClick={onDeleteClick}
          disabled={deleting}
          aria-label={confirming ? "Потвърди изтриването" : "Изтрий снимката"}
          className={`absolute top-2 right-2 flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium backdrop-blur transition-colors ${
            confirming ? "bg-destructive text-white" : "bg-foreground/60 text-background hover:bg-destructive"
          }`}
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {confirming && !deleting && "Сигурен?"}
        </button>
      </div>

      <div className="space-y-2 p-2.5">
        <select
          value={category}
          disabled={pending || deleting}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Категория"
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {galleryCategories
            .filter((c) => c.value !== "all")
            .map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          {/* Стара/непозната категория от seed данните остава видима, но не може да се избере наново */}
          {!galleryCategories.some((c) => c.value === category) && (
            <option value={category} disabled>
              {category}
            </option>
          )}
        </select>

        <input
          type="text"
          value={description}
          disabled={pending || deleting}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={onDescriptionBlur}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="Описание…"
          aria-label="Описание"
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />

        <GalleryResourceTag imageId={image.id} resourceId={image.resourceId} resources={resources} />
      </div>
    </div>
  );
}
