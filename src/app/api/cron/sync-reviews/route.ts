import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runReviewsSync } from "@/lib/actions/google-reviews";
import { authorizeCron } from "@/lib/cron-auth";
import { purgeOldInquiries } from "@/lib/rental/inquiry-purge";

export const dynamic = "force-dynamic";

/**
 * Тегли свежите Google отзиви от Featurable (което само sync-ва с Google профила
 * на всеки ~24-48ч) и обновява базата + summary-то. Ръчните („manual-") отзиви,
 * вкл. негативния за прозрачност, оцеляват.
 *
 * Същата дневна задача трие запитванията от обявите, по-стари от 6 месеца (политиката за
 * поверителност). Падне ли триенето, отзивите пак се теглят, а отговорът е 500 с грешката.
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let inquiriesPurged: number | null = null;
  let purgeError: string | null = null;
  try {
    inquiriesPurged = await purgeOldInquiries();
  } catch (e) {
    purgeError = e instanceof Error ? e.message : String(e);
    console.error("[cron sync-reviews] триенето на старите запитвания падна:", purgeError);
  }

  const res = await runReviewsSync();
  if (res.ok) {
    revalidatePath("/admin/reviews");
    revalidatePath("/");
  }
  return NextResponse.json({ ...res, inquiriesPurged, purgeError }, { status: purgeError ? 500 : 200 });
}
