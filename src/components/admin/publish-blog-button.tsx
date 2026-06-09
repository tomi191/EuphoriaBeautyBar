"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishBlogPost, unpublishBlogPost } from "@/lib/actions/blog";

interface PublishBlogButtonProps {
  id: string;
  /** Текущ статус — определя дали бутонът публикува или връща в чернова. */
  status: string;
}

export function PublishBlogButton({ id, status }: PublishBlogButtonProps) {
  const [pending, startTransition] = React.useTransition();
  const isPublished = status === "published";

  function handleClick() {
    startTransition(async () => {
      try {
        if (isPublished) {
          await unpublishBlogPost(id);
          toast.success("Статията е върната в чернова.");
        } else {
          await publishBlogPost(id);
          toast.success("Статията е публикувана.");
        }
      } catch (err) {
        toast.error("Грешка при промяна на статуса.");
        console.error(err);
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="shrink-0"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isPublished ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
      {isPublished ? "В чернова" : "Публикувай"}
    </Button>
  );
}
