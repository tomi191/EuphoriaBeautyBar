"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { navigation, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 80], [0, 1]);
  const blur = useTransform(scrollY, [0, 80], [0, 20]);

  // Скрит в админ панела и приложението за екипа — те имат собствена навигация.
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  return (
    <header className="sticky top-0 z-50 w-full">
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 border-b border-border/40 bg-background/75"
        style={{ opacity, backdropFilter: useTransform(blur, (b) => `blur(${b}px) saturate(180%)`) }}
      />
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <Logo width={120} height={120} className="h-12 w-auto md:h-14" />

        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {navigation.map((item) =>
              item.children ? (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuTrigger
                    className={cn(
                      "bg-transparent text-sm font-medium",
                      pathname.startsWith(item.href) && "text-primary",
                    )}
                  >
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[460px] gap-2 p-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={child.href}
                              className="group block rounded-lg p-3 transition-colors hover:bg-secondary"
                            >
                              <div className="flex items-center justify-between text-sm font-medium">
                                <span>{child.label}</span>
                                <span className="text-muted-foreground transition-transform group-hover:translate-x-1">
                                  →
                                </span>
                              </div>
                              {child.description && (
                                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                  {child.description}
                                </p>
                              )}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "bg-transparent text-sm font-medium",
                        pathname === item.href && "text-primary",
                      )}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ),
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <a href={`tel:${siteConfig.contact.phone}`} aria-label="Обади се">
              <Phone className="size-4" />
              <span className="hidden xl:inline">{siteConfig.contact.phoneFormatted}</span>
            </a>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden bg-primary text-primary-foreground hover:bg-primary/90 md:inline-flex"
          >
            <Link href="/zapazi-chas">Резервирай час</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
