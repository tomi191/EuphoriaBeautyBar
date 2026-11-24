"use client";

import * as React from "react";
import { Images } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** «Виж работа (N)» на картата в «За нас»: снимките, тагнати към специалиста в галерията. */
export function TenantWorkButton({ title, portfolio }: { title: string; portfolio: { src: string; alt: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline lg:text-[15px]"
      >
        <Images className="size-4" strokeWidth={1.8} /> Виж работа ({portfolio.length})
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl" description="Снимки от работата на специалиста в салона.">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {portfolio.map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={img.src} alt={img.alt} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
