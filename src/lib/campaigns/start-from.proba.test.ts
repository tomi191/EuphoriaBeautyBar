/**
 * №11: «Започни от ДД.ММ» в стъпка «Цената» и сървърът при «Към датите» смятат към един и същи ден.
 * Пробната база probak3 (PROBA_DB=1, DATABASE_URL към 127.0.0.1:54331): там цената на педикюра при
 * специалиста по маникюр е пипната на 12.11 в 14:16 (Sofia), т.е. намаление може от момент в средата на 12.12.
 * Само чете базата.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const VIOLETA = "p11k-nails";
const PEDI = "p11k-s3";

let core: typeof import("@/lib/campaigns/core");
let rules: typeof import("@/lib/campaigns/rules");

describe.skipIf(!process.env.PROBA_DB)("«Започни от» и проверката на сървъра", () => {
  beforeAll(async () => {
    (await import("dotenv")).config({ path: ".env.local" });
    if (!/@(127\.0\.0\.1|localhost):54331\//.test(process.env.DATABASE_URL ?? "")) throw new Error("само пробната база");
    core = await import("@/lib/campaigns/core");
    rules = await import("@/lib/campaigns/rules");
  });

  it("датата от «Започни от» минава проверката на цената на сървъра", async () => {
    const base = { kind: "discount" as const, serviceItemIds: [PEDI], newPrices: {}, gift: null, reason: null, slots: null, firstVisitOnly: false };
    const today = core.todaySofia();
    // Стъпка «Цената» до избора на дата: проверка към днес (както buildInput(2) във формата).
    const now = await core.gatherContext(VIOLETA, { ...base, startsOn: today, endsOn: today });
    const block = rules.serviceProblem("discount", now.services[0], today, today);
    expect(block?.from, "в пробата педикюрът трябва да е спрян с «може от»").toBeTruthy();
    const from = block!.from!;

    // «Започни от»: сървърът смята наново към началото на промоцията.
    const at = await core.gatherContext(VIOLETA, { ...base, startsOn: from, endsOn: from });
    const s = at.services[0];
    expect(s.lowest.discountAllowed).toBe(true);
    // «Към датите»: проверката на сървъра няма забрана за цената, щом новата цена е в границите.
    const prev = s.lowest.lowestEur!;
    const input = { ...base, startsOn: from, endsOn: from, newPrices: { [PEDI]: Math.round(prev * 0.8) } };
    const price = rules.checkCampaign(input, at).filter((p) => p.field === "price");
    expect(price).toEqual([]);
    // Денят преди това още е спрян: датата е първата възможна, не по-късна.
    const before = await core.gatherContext(VIOLETA, { ...base, startsOn: rules.addDays(from, -1), endsOn: from });
    expect(before.services[0].lowest.discountAllowed).toBe(false);
  });
});
