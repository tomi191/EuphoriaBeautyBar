"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serviceCategories } from "@/lib/data/services";

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  email: z.string().email("Невалиден имейл"),
  phone: z.string().min(6, "Минимум 6 символа"),
  service: z.string().optional(),
  date: z.string().optional(),
  message: z.string().max(1000, "Максимум 1000 символа").optional(),
  consent: z.boolean().refine((v) => v, { message: "Необходимо е съгласие" }),
  honey: z.string().max(0, "Не попълвайте това поле").optional(),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", service: "", date: "", message: "", consent: false, honey: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Грешка при изпращане");
      toast.success("Благодарим! Ще се свържем с теб скоро.");
      form.reset();
    } catch (e) {
      toast.error("Нещо не сработи. Моля опитай отново или се обади.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <input type="text" {...form.register("honey")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Име *</FormLabel>
                <FormControl>
                  <Input placeholder="Мария Петрова" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Телефон *</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+359 ..." {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имейл *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ti@email.com" {...field} className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="service"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Услуга</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Избери услуга" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceCategories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Желана дата</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Съобщение</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Разкажи ни какво търсиш..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 size-4 rounded border-border"
                />
              </FormControl>
              <div>
                <FormLabel className="text-sm font-normal text-muted-foreground">
                  Съгласен/на съм данните ми да бъдат използвани за връзка с мен във връзка с резервацията.
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={submitting}
          size="lg"
          className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto sm:px-8"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Изпращане...
            </>
          ) : (
            <>
              <Send className="size-4" /> Изпрати запитване
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
