"use client"

import * as React from "react"
import { CircleHelp } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

type Hint = { title: string; text: string }

function FieldHint({ hint, className }: { hint: Hint; className?: string }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Пояснение: ${hint.title}`}
          onClick={(e) => {
            // Ако стои във <label>, тапването не трябва да превключва switch-а.
            e.stopPropagation()
          }}
          style={{ touchAction: "manipulation" }}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          <CircleHelp className="size-4" aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="field-hint-content"
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-72 max-w-[calc(100vw-24px)] rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md"
        >
          <p className="font-medium">{hint.title}</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{hint.text}</p>
          <PopoverPrimitive.Arrow className="fill-popover stroke-border" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function LabelWithHint({
  htmlFor,
  label,
  hint,
  className,
}: {
  htmlFor?: string
  label: React.ReactNode
  hint: Hint
  className?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor} className={className}>
        {label}
      </Label>
      <FieldHint hint={hint} />
    </div>
  )
}

export { FieldHint, LabelWithHint }
