export function contactPickerSupported(): boolean {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

export async function pickContact(): Promise<{ name: string; phone: string } | null> {
  if (!contactPickerSupported()) return null;
  try {
    // @ts-expect-error navigator.contacts не е в стандартните TS типове
    const results = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (!results || results.length === 0) return null;
    const c = results[0] as { name?: string[]; tel?: string[] };
    return { name: (c.name && c.name[0]) || "", phone: (c.tel && c.tel[0]) || "" };
  } catch {
    return null;
  }
}
