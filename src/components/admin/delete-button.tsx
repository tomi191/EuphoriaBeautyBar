"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface DeleteButtonProps {
  action: () => Promise<void>;
  label?: string;
  size?: "sm" | "icon";
}

export function DeleteButton({ action, label = "Изтрий", size = "icon" }: DeleteButtonProps) {
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    if (!confirm("Сигурен ли си? Тази операция е необратима.")) return;
    startTransition(async () => {
      try {
        await action();
        toast.success("Изтрито.");
      } catch (err) {
        toast.error("Грешка при изтриване.");
        console.error(err);
      }
    });
  }

  if (size === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={pending}
        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={label}
      >
        <Trash2 className="size-4" />
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending} className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
      <Trash2 className="size-4" /> {label}
    </Button>
  );
}
