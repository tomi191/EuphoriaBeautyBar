"use client";

import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GalleryUploadForm } from "@/components/admin/gallery-upload-form";
import { cn } from "@/lib/utils";

/** «Качи снимка» горе вдясно (кадър «В-админ-1440»): отваря досегашната форма за качване на Снежана. */
export function GalleryUploadToggle({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-[15px] font-medium text-background transition-colors hover:bg-foreground/90 lg:h-10 lg:text-sm",
            className,
          )}
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Качи снимка
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="text-lg">Качи снимка</DialogTitle>
        <GalleryUploadForm />
      </DialogContent>
    </Dialog>
  );
}
