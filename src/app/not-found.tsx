import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/reactbits/aurora-background";
import { BlurText } from "@/components/reactbits/blur-text";

export default function NotFound() {
  return (
    <AuroraBackground intensity="soft">
      <section className="relative grid min-h-[80vh] place-items-center px-4 text-center">
        <div>
          <p className="font-display text-[10rem] leading-none font-medium text-primary md:text-[16rem]">
            404
          </p>
          <BlurText
            as="h1"
            text="Тази страница се изгуби в красотата."
            className="mt-4 font-display text-3xl font-medium md:text-5xl"
          />
          <p className="mx-auto mt-6 max-w-md font-serif text-lg italic text-muted-foreground">
            Може би вместо това искаш да разгледаш услугите ни или да резервираш час.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-primary hover:bg-primary/90">
              <Link href="/">
                <Home className="size-4" /> Обратно към начало
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link href="/uslugi">
                <ArrowLeft className="size-4" /> Виж услугите
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AuroraBackground>
  );
}
