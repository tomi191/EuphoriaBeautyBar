/**
 * Проверява, че заявката идва от Vercel Cron (или оторизиран викащ).
 * Vercel изпраща хедър `Authorization: Bearer ${CRON_SECRET}`.
 */
export function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
