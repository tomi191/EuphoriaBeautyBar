import { siteConfig } from "@/lib/site";

/** Escape на потребителски вход преди вмъкване в HTML email — спира injection. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

/** Базов URL за линкове/активи в имейла (production домейн, не localhost при dev пуш). */
function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https") ? process.env.NEXT_PUBLIC_SITE_URL : siteConfig.url;
}

function fromAddr(): string {
  return process.env.CONTACT_FROM_EMAIL ?? `Euphoria <noreply@${new URL(siteConfig.url).hostname}>`;
}

/** Дата + час на български, в часова зона на салона. */
export function formatWhen(start: Date): string {
  const d = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(start);
  const t = new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  return `${d}, ${t} ч.`;
}

/**
 * Изпраща имейл през Resend. Връща true само при реално приет имейл — false при
 * липсващ ключ, Resend грешка или API отговор с error. Не хвърля. Извикващите, за
 * които доставката е важна (reminders), маркират „изпратено" само при true.
 */
async function send(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY липсва — имейлът не е изпратен:", opts.subject);
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({ from: fromAddr(), ...opts });
    if (res.error) {
      console.error("Resend error", res.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend error", err);
    return false;
  }
}

const wrap = (inner: string) => `
  <div style="background:#f4efe9;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif;color:#2b2b2b">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7e0d6">
      <div style="padding:24px 28px;border-bottom:1px solid #f0eae1;text-align:center">
        <img src="${baseUrl()}/images/brand/logo-black.png" alt="Euphoria Hair & Beauty Bar" width="150" style="height:auto;max-width:150px" />
      </div>
      <div style="padding:28px">${inner}</div>
      <div style="padding:18px 28px;border-top:1px solid #f0eae1;font-size:12px;color:#8a8279;text-align:center">
        <a href="${siteConfig.address.mapsUrl}" style="color:#6f9e85;text-decoration:none">${esc(siteConfig.address.full)}</a> · <a href="tel:${siteConfig.contact.phone}" style="color:#6f9e85;text-decoration:none">${siteConfig.contact.phoneFormatted}</a>
      </div>
    </div>
  </div>`;

// Трети елемент = стойността е готов HTML (не се escape-ва) — за линкове напр. адрес.
const detailsTable = (rows: [string, string, boolean?][]) => `
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${rows
      .map(
        ([k, v, isHtml]) => `<tr>
          <td style="padding:8px 0;color:#8a8279;font-size:14px;width:38%">${esc(k)}</td>
          <td style="padding:8px 0;font-size:14px;font-weight:600">${isHtml ? v : esc(v)}</td>
        </tr>`,
      )
      .join("")}
  </table>`;

/** Адресът като линк към локацията на салона (за имейл detailsTable). */
const addressCell = (): [string, string, boolean] => [
  "Къде",
  `<a href="${siteConfig.address.mapsUrl}" style="color:#6f9e85;text-decoration:underline">${esc(siteConfig.address.full)}</a>`,
  true,
];

export interface BookingEmailData {
  clientName: string;
  serviceName: string;
  performerName: string;
  start: Date;
  /** Форматирана ориентировъчна цена (напр. „20 лв" / „от 40 лв" / „60–90 лв"). */
  priceLabel?: string;
  /** Ако клиентът още не е потвърдил имейла си — линк за потвърждение (онбординг). */
  verifyUrl?: string;
  /** Линк за онлайн отмяна на часа (token = booking id). */
  cancelUrl?: string;
}

/** Потвърждение към клиента, че часът е запазен. */
export async function sendBookingConfirmation(to: string, data: BookingEmailData): Promise<void> {
  const when = formatWhen(data.start);
  const verifyBlock = data.verifyUrl
    ? `<div style="margin-top:20px;padding:16px;background:#f4efe9;border-radius:12px;text-align:center">
        <p style="margin:0 0 12px;font-size:13px;color:#6b6359">Потвърди имейла си, за да получаваш напомняния и по-бързо записване следващия път.</p>
        <a href="${data.verifyUrl}" style="display:inline-block;background:#2b2b2b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:14px">Потвърди имейла</a>
      </div>`
    : "";

  await send({
    to,
    subject: `Часът ти е запазен — ${formatWhen(data.start)}`,
    html: wrap(`
      <h1 style="margin:0 0 6px;font-size:22px">Здравей, ${esc(data.clientName)}!</h1>
      <p style="margin:0 0 4px;color:#6b6359;font-size:15px">Часът ти в Euphoria е запазен. Очакваме те.</p>
      ${detailsTable([
        ["Услуга", data.serviceName],
        ["Изпълнител", data.performerName],
        ["Кога", when],
        ...(data.priceLabel ? ([["Ориентировъчна цена", data.priceLabel]] as [string, string][]) : []),
        addressCell(),
      ])}
      ${
        data.priceLabel
          ? `<p style="margin:0 0 8px;font-size:12px;color:#8a8279">Цената е ориентировъчна и може да варира според дължината и състоянието на косата и използваните продукти.</p>`
          : ""
      }
      <p style="margin:8px 0 0;font-size:13px;color:#8a8279">
        ${data.cancelUrl
          ? `Ако се налага да отмениш — <a href="${data.cancelUrl}" style="color:#6f9e85;text-decoration:underline">откажи онлайн</a> или се обади на`
          : "Ако се налага да отмениш, обади се на"} <a href="tel:${siteConfig.contact.phone}" style="color:#6f9e85">${siteConfig.contact.phoneFormatted}</a> минимум 5 часа преди часа. При закъснение или неявяване се начислява 50% от стойността на услугата.
      </p>
      ${verifyBlock}
    `),
  });
}

/** Напомняне към клиента преди часа. */
export async function sendReminder(to: string, data: BookingEmailData): Promise<boolean> {
  return await send({
    to,
    subject: `Напомняне: имаш час в Euphoria — ${formatWhen(data.start)}`,
    html: wrap(`
      <h1 style="margin:0 0 6px;font-size:22px">Здравей, ${esc(data.clientName)}!</h1>
      <p style="margin:0 0 4px;color:#6b6359;font-size:15px">Напомняме ти за предстоящия час. Очакваме те!</p>
      ${detailsTable([
        ["Услуга", data.serviceName],
        ["Изпълнител", data.performerName],
        ["Кога", formatWhen(data.start)],
        addressCell(),
      ])}
      <p style="margin:8px 0 0;font-size:13px;color:#8a8279">
        Ако се налага да отмениш, обади се на <a href="tel:${siteConfig.contact.phone}" style="color:#6f9e85">${siteConfig.contact.phoneFormatted}</a> минимум 5 часа преди часа.
      </p>
    `),
  });
}

/** Покана за отзив след завършен час. */
export async function sendReviewRequest(to: string, data: BookingEmailData & { reviewUrl?: string }): Promise<void> {
  const cta = data.reviewUrl
    ? `<div style="margin-top:18px;text-align:center">
        <a href="${data.reviewUrl}" style="display:inline-block;background:#2b2b2b;color:#fff;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:14px">Остави отзив</a>
      </div>`
    : `<p style="margin:14px 0 0;font-size:13px;color:#8a8279">Можеш да ни оставиш мнение в Google или да отговориш на този имейл — за нас е важно.</p>`;
  await send({
    to,
    subject: "Как мина в Euphoria?",
    html: wrap(`
      <h1 style="margin:0 0 6px;font-size:22px">Благодарим ти, ${esc(data.clientName)}!</h1>
      <p style="margin:0;color:#6b6359;font-size:15px">
        Надяваме се да си доволна от ${esc(data.serviceName)} при ${esc(data.performerName)}. Мнението ти помага на други да ни открият и на нас — да ставаме по-добри.
      </p>
      ${cta}
    `),
  });
}

/** Известие към салона за нов онлайн запис. */
export async function sendSalonNotification(data: BookingEmailData & { clientPhone: string; clientEmail: string }): Promise<void> {
  const to = process.env.CONTACT_TO_EMAIL ?? siteConfig.contact.email;
  await send({
    to,
    replyTo: data.clientEmail,
    subject: `Нов онлайн запис: ${data.serviceName} — ${formatWhen(data.start)}`,
    html: wrap(`
      <h1 style="margin:0 0 6px;font-size:20px">Нов онлайн запис</h1>
      ${detailsTable([
        ["Клиент", data.clientName],
        ["Телефон", data.clientPhone],
        ["Имейл", data.clientEmail],
        ["Услуга", data.serviceName],
        ["Изпълнител", data.performerName],
        ["Кога", formatWhen(data.start)],
      ])}
    `),
  });
}
