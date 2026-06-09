import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/lib/actions/public-booking";

export const metadata: Metadata = {
  title: "Потвърждение на имейл",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;

  return (
    <section className="bg-cream pt-32 pb-20 lg:pt-40">
      <div className="mx-auto max-w-md px-4 text-center lg:px-8">
        {ok ? (
          <>
            <CheckCircle2 className="mx-auto size-12 text-primary" strokeWidth={1.5} />
            <h1 className="mt-5 font-display text-3xl font-medium">Имейлът е потвърден</h1>
            <p className="mt-3 text-muted-foreground">
              Благодарим! Вече ще получаваш напомняния за часовете си, а следващото записване ще е по-бързо.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="mt-5 font-display text-3xl font-medium">Невалиден или изтекъл линк</h1>
            <p className="mt-3 text-muted-foreground">
              Този линк за потвърждение вече е използван или не е валиден. Ако имаш запазен час, той остава активен.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-foreground px-7 text-sm font-medium text-background hover:bg-primary"
        >
          Към сайта
        </Link>
      </div>
    </section>
  );
}
