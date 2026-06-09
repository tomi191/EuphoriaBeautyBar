"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Phone, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { navigation, siteConfig } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Отвори меню">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b px-6 pt-6 pb-4">
          <SheetTitle className="font-display text-xl">Меню</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-secondary"
              >
                {item.label}
                <span className="text-muted-foreground">→</span>
              </Link>
              {item.children && (
                <div className="mt-1 ml-3 flex flex-col gap-0.5 border-l border-border/60 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <Separator />
        <div className="space-y-3 p-6 text-sm">
          <a
            href={`tel:${siteConfig.contact.phone}`}
            className="flex items-center gap-3 text-foreground transition-colors hover:text-primary"
          >
            <Phone className="size-4 text-primary" /> {siteConfig.contact.phoneFormatted}
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(siteConfig.address.full)}`}
            target="_blank"
            rel="noopener"
            className="flex items-start gap-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            <MapPin className="size-4 shrink-0 text-primary" /> {siteConfig.address.full}
          </a>
          <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/zapazi-chas" onClick={() => setOpen(false)}>
              Резервирай час
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
