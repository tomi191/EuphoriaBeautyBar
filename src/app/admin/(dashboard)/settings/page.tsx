import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/admin/page-header";
import { siteConfig } from "@/lib/site";
import { getClosedDates } from "@/lib/booking/closures";
import { ClosuresManager } from "@/components/admin/closures-manager";
import { TestPushButton } from "@/components/admin/test-push-button";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const closed = await getClosedDates();
  return (
    <>
      <PageHeader title="Настройки" subtitle="Глобални параметри на сайта и интеграции." />

      <div className="grid gap-6">
        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-display text-xl font-medium">Бизнес информация</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Адрес, телефон и работно време. Текущо се поддържат в кода (<code>src/lib/site.ts</code>) — за inline редакция от админа е добавено в roadmap-а.
          </p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Име</dt><dd>{siteConfig.name}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Телефон</dt><dd>{siteConfig.contact.phoneFormatted}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Имейл</dt><dd>{siteConfig.contact.email}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted-foreground">Адрес</dt><dd>{siteConfig.address.full}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Facebook</dt><dd className="truncate"><a className="text-primary hover:underline" href={siteConfig.social.facebook}>{siteConfig.social.facebook}</a></dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Instagram</dt><dd className="truncate"><a className="text-primary hover:underline" href={siteConfig.social.instagram}>{siteConfig.social.instagram}</a></dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-display text-xl font-medium">Затворени дни</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Национални празници, отпуск или извънредно затваряне — салонът не приема записи на тези дати (за всички изпълнители).
          </p>
          <div className="mt-5">
            <ClosuresManager initial={closed} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-display text-xl font-medium">Интеграции</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <IntegrationRow label="Resend (имейли)" present={!!process.env.RESEND_API_KEY} env="RESEND_API_KEY" />
            <IntegrationRow label="Google Places API (ревюта)" present={!!process.env.GOOGLE_PLACES_API_KEY} env="GOOGLE_PLACES_API_KEY" />
            <IntegrationRow label="Google Place ID" present={!!process.env.GOOGLE_PLACE_ID} env="GOOGLE_PLACE_ID" />
            <IntegrationRow label="Google Maps embed" present={!!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY} env="NEXT_PUBLIC_GOOGLE_MAPS_KEY" />
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-background p-6">
          <h2 className="font-display text-xl font-medium">Известия (push)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Изпрати тестово push известие до всички абонирани устройства — в реалния формат на нов запис.
            Ако устройството върне успех, но известие не дойде на телефона, причината е device-level
            (battery optimization или изключени нотификации за инсталираното приложение), не в кода.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <IntegrationRow
              label="Web Push (VAPID)"
              present={!!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY}
              env="VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY"
            />
          </ul>
          <div className="mt-5">
            <TestPushButton />
          </div>
        </section>

        <Alert>
          <AlertTitle>За парола и потребители</AlertTitle>
          <AlertDescription>
            Управлението на администратори (нови потребители, нулиране на парола) се добавя във втора фаза.
            Текущо паролата на admin акаунта се сменя през Better Auth API или директно в DB (хеширана).
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}

function IntegrationRow({ label, present, env }: { label: string; present: boolean; env: string }) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground font-mono">{env}</p>
      </div>
      <span className={"rounded-full px-3 py-1 text-xs font-medium " + (present ? "bg-mint/40 text-foreground" : "bg-secondary text-muted-foreground")}>
        {present ? "конфигуриран" : "липсва"}
      </span>
    </li>
  );
}
