import { NextResponse } from "next/server";
import crypto from "node:crypto";

// ВРЕМЕНЕН диагностичен endpoint: проверява дали prod VAPID двойката е консистентна.
// Връща САМО булеви стойности + последните 6 знака на ПУБЛИЧНИ ключове (които и без това
// са в клиентския bundle). НЕ връща private ключа. Махни след диагностиката.
export const dynamic = "force-dynamic";

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function bufToB64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const npub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  let derived = "";
  let deriveError: string | null = null;
  try {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(b64urlToBuf(priv));
    derived = bufToB64url(ecdh.getPublicKey());
  } catch (e) {
    deriveError = (e as Error).message;
  }

  return NextResponse.json({
    hasPrivate: !!priv,
    hasPublic: !!pub,
    hasNextPublic: !!npub,
    privateMatchesPublic: !!derived && derived === pub,
    privateMatchesNextPublic: !!derived && derived === npub,
    publicEqualsNextPublic: !!pub && pub === npub,
    pubTail: pub.slice(-6),
    npubTail: npub.slice(-6),
    derivedTail: derived.slice(-6),
    deriveError,
  });
}
