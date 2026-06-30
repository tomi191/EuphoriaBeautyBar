import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runReviewsSync } from "@/lib/actions/google-reviews";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Тегли свежите Google отзиви от Featurable (което само sync-ва с Google профила
 * на всеки ~24-48ч) и обновява базата + summary-то. Ръчните („manual-") отзиви,
 * вкл. негативния за прозрачност, оцеляват.
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await runReviewsSync();
  if (res.ok) {
    revalidatePath("/admin/reviews");
    revalidatePath("/");
  }
  return NextResponse.json(res);
}
