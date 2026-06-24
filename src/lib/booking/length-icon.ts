/** Връща пътя към снимката за дължина според името на услугата, или null. */
export function lengthIconFor(name: string): string | null {
  if (/къса коса/i.test(name)) return "/images/lengths/hair-short.png";
  if (/средна коса/i.test(name)) return "/images/lengths/hair-medium.png";
  if (/дълга коса/i.test(name)) return "/images/lengths/hair-long.png";
  return null;
}
