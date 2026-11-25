import { writeFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cancellationPolicy } from "@/lib/site";

const sent = vi.hoisted(() => [] as Array<{ to: string; html: string }>);
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (opts: { to: string; html: string }) => {
        sent.push(opts);
        return { data: { id: "proba" }, error: null };
      },
    };
  },
}));

afterEach(() => vi.unstubAllEnvs());

const URL_ = "https://www.euphoriabeauty.eu/otkazhi-chas/proba17";
const data = {
  clientName: "Проба",
  serviceName: "Подстригване",
  performerName: "Снежана",
  start: new Date("2026-12-01T10:00:00Z"),
  cancelUrl: URL_,
};
// Плътен бутон = връзка с тъмен фон; «Откажи часа» е контурен (Канопус, №17).
const buttons = (html: string) => html.match(/<a [^>]*background:#2b2b2b[^>]*>([^<]*)<\/a>/g) ?? [];
const cancelButtons = (html: string) => html.match(/<a [^>]*>Откажи часа<\/a>/g) ?? [];

// №17: бутонът «Откажи часа» в двете писма, един основен бутон, редът за 50% до него.
describe("бутонът «Откажи часа» в писмата", () => {
  it("напомнянето: бутон към линка за отказ и редът за 50%", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_proba");
    const { sendReminder } = await import("@/lib/email/booking");
    sent.length = 0;
    expect(await sendReminder("proba@example.com", data)).toBe(true);
    const html = sent[0].html;
    expect(cancelButtons(html)).toEqual([`<a href="${URL_}" style="display:inline-block;background:#ffffff;color:#2b2b2b;border:1.5px solid #2b2b2b;text-decoration:none;padding:13px 27px;border-radius:999px;font-size:15px">Откажи часа</a>`]);
    expect(buttons(html)).toEqual([]);
    expect(html).toContain("Не можеш да дойдеш? Откажи часа от бутона най-късно 5 часа преди началото.");
    expect(html).toContain(cancellationPolicy.lateFee);
    if (process.env.EMAIL_PREVIEW_DIR) writeFileSync(`${process.env.EMAIL_PREVIEW_DIR}/napomnyane.html`, html);
  });

  it("потвърждението за нов клиент: «Откажи часа» е единственият бутон, «Потвърди имейла» е връзка", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_proba");
    const { sendBookingConfirmation } = await import("@/lib/email/booking");
    sent.length = 0;
    await sendBookingConfirmation("proba@example.com", { ...data, verifyUrl: "https://www.euphoriabeauty.eu/verify-email?token=x" });
    const html = sent[0].html;
    expect(cancelButtons(html)).toHaveLength(1);
    expect(cancelButtons(html)[0]).toContain("border:1.5px solid #2b2b2b");
    expect(buttons(html)).toEqual([]);
    expect(html).toContain(">Потвърди имейла</a>");
    expect(html).not.toContain("—");
    if (process.env.EMAIL_PREVIEW_DIR) writeFileSync(`${process.env.EMAIL_PREVIEW_DIR}/potvarzhdenie-nov-klient.html`, html);
  });
});

// Канопус, №17: на 390 «ч.» и «г.» не остават сами на нов ред.
describe("formatWhen: неразделими интервали", () => {
  it("«2026 г.» и «09:00 ч.» са с неразделим интервал", async () => {
    const { formatWhen } = await import("@/lib/email/booking");
    expect(formatWhen(new Date("2026-11-26T07:00:00Z"))).toBe("четвъртък, 26 ноември 2026\u00a0г., 09:00\u00a0ч.");
  });
});
