// Биометричен вход (passkeys) — изцяло gated. Нищо не се показва освен ако
// NEXT_PUBLIC_PASSKEYS_ENABLED === "1" И устройството поддържа platform authenticator.
// Държи фичъра спящ докато не пуснат DB миграцията + флага.
export const passkeysEnabled = process.env.NEXT_PUBLIC_PASSKEYS_ENABLED === "1";

/** Има ли устройството вграден (platform) authenticator — Face ID / отпечатък / Windows Hello? */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
