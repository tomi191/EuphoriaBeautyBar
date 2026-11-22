import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Край на сътрудничеството: местата, заети от този специалист, стават «спрени» (не се пускат пред
 * хора сами). «Заета от» остава за историята, докато Снежана не отвори мястото пак.
 * Не е server action (без "use server"): вика се само от endCooperation и deleteResource.
 */
export async function releaseListingsFilledBy(resourceId: string) {
  return db
    .update(schema.rentalPositions)
    .set({ status: "paused", active: false, updatedAt: new Date() })
    .where(and(eq(schema.rentalPositions.filledByResourceId, resourceId), eq(schema.rentalPositions.status, "filled")))
    .returning({ id: schema.rentalPositions.id, title: schema.rentalPositions.title, slug: schema.rentalPositions.slug });
}
