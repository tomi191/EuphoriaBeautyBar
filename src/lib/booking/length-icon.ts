/**
 * Връща пътя към снимка за избор според услугата и дължината в името, или null.
 * Снимките са по УСЛУГА × ДЪЛЖИНА (боядисване=плътен цвят, балаяж=омбре,
 * подстригване=прическа). Услуги без съответна снимка (сешоар, прически —
 * Спринт 2) връщат null.
 */
export function lengthIconFor(name: string): string | null {
  const len = /къса коса/i.test(name)
    ? "short"
    : /средна коса/i.test(name)
      ? "medium"
      : /дълга коса/i.test(name)
        ? "long"
        : null;
  if (!len) return null;
  if (/балаяж|кичури/i.test(name)) return `/images/lengths/balayage-${len}.png`;
  if (/подстригване/i.test(name)) return `/images/lengths/haircut-${len}.png`;
  if (/боядисване|корекция/i.test(name)) return `/images/lengths/color-${len}.png`;
  return null;
}
