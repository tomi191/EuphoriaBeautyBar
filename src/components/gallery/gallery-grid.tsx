"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { galleryCategories, type GalleryCategory, type GalleryImage } from "@/lib/data/gallery";
import { cn } from "@/lib/utils";

interface GalleryGridProps {
  images: GalleryImage[];
}

export function GalleryGrid({ images }: GalleryGridProps) {
  const [filter, setFilter] = React.useState<GalleryCategory>("all");
  const [active, setActive] = React.useState<GalleryImage | null>(null);

  const filtered = React.useMemo(() => {
    return filter === "all" ? images : images.filter((img) => img.category === filter);
  }, [filter, images]);

  return (
    <>
      <div className="mb-10 flex flex-wrap gap-2">
        {galleryCategories.map((cat) => {
          const isActive = filter === cat.value;
          return (
            <Button
              key={cat.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat.value)}
              className={cn("rounded-full", isActive && "bg-primary text-primary-foreground")}
            >
              {cat.label}
            </Button>
          );
        })}
      </div>

      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
        <AnimatePresence mode="popLayout">
          {filtered.map((img, idx) => (
            <motion.button
              key={img.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: (idx % 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setActive(img)}
              className="group relative block w-full overflow-hidden rounded-2xl bg-secondary/50"
              aria-label={`Отвори ${img.alt}`}
            >
              <div
                className="relative w-full"
                style={{ paddingBottom: `${(img.height / img.width) * 100}%` }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <ZoomIn
                    className="absolute right-4 bottom-4 size-5 text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-0 bg-background/95 p-0 backdrop-blur-xl">
          <DialogTitle className="sr-only">{active?.alt}</DialogTitle>
          {active && (
            <div className="relative aspect-[4/5] w-full md:aspect-[16/10]">
              <Image
                src={active.src}
                alt={active.alt}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized
                priority
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 size-9 rounded-full bg-background/60 backdrop-blur"
                onClick={() => setActive(null)}
                aria-label="Затвори"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
