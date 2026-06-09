import { NextResponse } from "next/server";
import { z } from "zod";
import { siteConfig } from "@/lib/site";

/** Escape на потребителски вход преди вмъкване в HTML email — спира injection. */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  service: z.string().optional(),
  date: z.string().optional(),
  message: z.string().max(1000).optional(),
  consent: z.literal(true),
  honey: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  const { name, email, phone, service, date, message } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL ?? `Euphoria <noreply@${new URL(siteConfig.url).hostname}>`,
        to: process.env.CONTACT_TO_EMAIL ?? siteConfig.contact.email,
        replyTo: email,
        subject: `Ново запитване от ${name}`,
        html: `
          <div style="font-family:Inter,sans-serif">
            <h2>Ново запитване от сайта</h2>
            <p><strong>Име:</strong> ${esc(name)}</p>
            <p><strong>Имейл:</strong> ${esc(email)}</p>
            <p><strong>Телефон:</strong> ${esc(phone)}</p>
            ${service ? `<p><strong>Услуга:</strong> ${esc(service)}</p>` : ""}
            ${date ? `<p><strong>Желана дата:</strong> ${esc(date)}</p>` : ""}
            ${message ? `<p><strong>Съобщение:</strong><br/>${esc(message).replace(/\n/g, "<br/>")}</p>` : ""}
          </div>
        `,
      });
    } catch (err) {
      console.error("Resend error", err);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  } else {
    console.warn("RESEND_API_KEY missing — запитването е логнато само в конзолата.");
    console.log("Contact submission:", parsed.data);
  }

  return NextResponse.json({ ok: true });
}
