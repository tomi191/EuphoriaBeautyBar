"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadGalleryImage } from "@/lib/actions/gallery";
import { galleryCategories } from "@/lib/data/gallery";
import { cn } from "@/lib/utils";

const MAX_EDGE = 1600;

interface Prepared {
  file: File;
  width: number;
  height: number;
  previewUrl: string;
}

/**
 * Свива изображението в браузъра до MAX_EDGE px по дългата страна и го кодира като WebP
 * (по-малък storage + по-бърза галерия — grid-ът сервира файловете unoptimized).
 * Ако браузърът не може да кодира WebP (стар Safari), качва оригинала.
 */
async function prepareFile(file: File): Promise<Prepared> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (blob && blob.type === "image/webp") {
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    const webp = new File([blob], name, { type: "image/webp" });
    return { file: webp, width, height, previewUrl: URL.createObjectURL(webp) };
  }
  // Fallback (браузър без WebP encode): качваме оригинала → размерите са оригиналните.
  return { file, width: originalWidth, height: originalHeight, previewUrl: URL.createObjectURL(file) };
}

export function GalleryUploadForm() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<Prepared[]>([]);
  const [category, setCategory] = React.useState("boyadisvane");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    try {
      const prepared = await Promise.all(Array.from(list).map(prepareFile));
      setItems((prev) => [...prev, ...prepared]);
    } catch {
      toast.error("Файлът не може да бъде прочетен като изображение.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeItem(idx: number) {
    setItems((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function onUpload() {
    if (items.length === 0) return;
    setBusy(true);
    let uploaded = 0;
    try {
      for (const [i, item] of items.entries()) {
        setProgress(`Качване ${i + 1} от ${items.length}…`);
        const fd = new FormData();
        fd.set("file", item.file);
        fd.set("category", category);
        fd.set("description", description);
        fd.set("width", String(item.width));
        fd.set("height", String(item.height));
        const res = await uploadGalleryImage(fd);
        if (!res.ok) {
          toast.error(`${item.file.name}: ${res.error}`);
          break;
        }
        uploaded++;
      }
      if (uploaded > 0) {
        toast.success(uploaded === 1 ? "Снимката е добавена в галерията." : `${uploaded} снимки са добавени в галерията.`);
        items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
        setItems([]);
        setDescription("");
        router.refresh();
      }
    } catch {
      toast.error("Грешка при качване. Опитай пак.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40">
          <label htmlFor="gallery-category" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Категория
          </label>
          <select
            id="gallery-category"
            value={category}
            disabled={busy}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {galleryCategories
              .filter((c) => c.value !== "all")
              .map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
          </select>
        </div>

        <div className="min-w-60 flex-1">
          <label htmlFor="gallery-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Описание (по избор — показва се на сайта и служи за alt текст)
          </label>
          <input
            id="gallery-description"
            type="text"
            value={description}
            disabled={busy}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="напр. Балеаж с копринен гланц върху дълга коса"
            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-4" />
          Избери снимки
        </Button>
        <Button type="button" disabled={busy || items.length === 0} onClick={onUpload}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {progress ?? (items.length > 1 ? `Качи ${items.length} снимки` : "Качи в галерията")}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <div key={item.previewUrl} className="relative size-20 overflow-hidden rounded-lg border border-border">
              {/* Blob preview — нарочно <img>, next/image не работи с object URL */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={busy}
                aria-label="Премахни от списъка"
                className={cn(
                  "absolute top-1 right-1 flex size-5 items-center justify-center rounded-full",
                  "bg-foreground/70 text-background backdrop-blur transition-colors hover:bg-foreground",
                )}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
