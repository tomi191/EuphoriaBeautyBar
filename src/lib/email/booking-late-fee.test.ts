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

// Решение 29: писмото за потвърждение казва за 50% с общото изречение от site.ts, както формата и ЧЗВ.
describe("sendBookingConfirmation: таксата за късен отказ", () => {
  it.each([
    ["с линк за онлайн отказ", "https://www.euphoriabeauty.eu/otkaz/proba"],
    ["без линк", undefined],
  ])("%s", async (_name, cancelUrl) => {
    vi.stubEnv("RESEND_API_KEY", "re_proba");
    const { sendBookingConfirmation } = await import("@/lib/email/booking");
    sent.length = 0;
    const ok = await sendBookingConfirmation("proba@example.com", {
      clientName: "Проба",
      serviceName: "Подстригване",
      performerName: "Снежана",
      start: new Date("2026-12-01T10:00:00Z"),
      cancelUrl,
    });
    expect(ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("proba@example.com");
    expect(sent[0].html).toContain(cancellationPolicy.lateFee);
    expect(sent[0].html).not.toContain("се начисляват 50%");
    if (process.env.EMAIL_PREVIEW_DIR) writeFileSync(`${process.env.EMAIL_PREVIEW_DIR}/potvarzhdenie-${cancelUrl ? "link" : "telefon"}.html`, sent[0].html);
  });
});
