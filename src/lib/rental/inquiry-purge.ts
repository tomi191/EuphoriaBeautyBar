import { lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { inquiryPurgeCutoff } from "@/lib/rental/inquiry-rules";

/**
 * Трие запитванията от обявите, дошли преди повече от 6 месеца (политиката за поверителност).
 * Вика се от дневната задача /api/cron/sync-reviews. Хвърля при грешка: викащият я пише в лога.
 */
export async function purgeOldInquiries(now: Date = new Date()): Promise<number> {
  const gone = await db
    .delete(schema.rentalInquiries)
    .where(lt(schema.rentalInquiries.createdAt, inquiryPurgeCutoff(now)))
    .returning({ id: schema.rentalInquiries.id });
  return gone.length;
}
