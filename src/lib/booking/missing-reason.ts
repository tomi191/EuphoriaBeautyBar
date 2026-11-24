/**
 * Защо бутонът «Запази час» е сив: какво липсва, с думите от доклада на Саиф
 * (2026-11-22-content-записването-текстове.md, част 4). Едно липсващо нещо → неговото
 * изречение; две и повече → «За да запазиш, остава: …» в реда услуга, специалист, час,
 * име, телефон, имейл, съгласие. Нищо не липсва → null.
 */
export interface BookingFormState {
  service: boolean;
  performer: boolean;
  slot: boolean;
  name: string;
  phone: string;
  email: string;
  consent: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Key = "service" | "performer" | "slot" | "name" | "phone" | "email" | "consent";

const NOUN: Record<Key, string> = {
  service: "услуга",
  performer: "специалист",
  slot: "час",
  name: "име",
  phone: "телефон",
  email: "имейл",
  consent: "съгласие",
};

export function missingReason(s: BookingFormState): string | null {
  const emailTyped = s.email.trim();
  const missing: Key[] = [];
  if (!s.service) missing.push("service");
  if (!s.performer) missing.push("performer");
  if (!s.slot) missing.push("slot");
  if (s.name.trim().length < 2) missing.push("name");
  if (s.phone.trim().length < 5) missing.push("phone");
  if (!EMAIL_RE.test(emailTyped)) missing.push("email");
  if (!s.consent) missing.push("consent");

  if (missing.length === 0) return null;
  if (missing.length > 1) {
    const nouns = missing.map((k) => NOUN[k]);
    const last = nouns.pop();
    return `За да запазиш, остава: ${nouns.join(", ")} и ${last}.`;
  }
  switch (missing[0]) {
    case "service":
      return "Избери услуга.";
    case "performer":
      return "Избери специалист.";
    case "slot":
      return "Липсва час. Избери един от свободните.";
    case "name":
      return "Липсва име. Напиши поне две букви.";
    case "phone":
      return "Липсва телефон. Напиши номера си, например 0888 123 456.";
    case "email":
      return emailTyped
        ? "Имейлът изглежда непълен. Провери за @ и домейн, например ime@gmail.com."
        : "Липсва имейл. На него пращаме потвърждението.";
    case "consent":
      return "Липсва съгласие. Отбележи, че приемаш условията.";
  }
}
