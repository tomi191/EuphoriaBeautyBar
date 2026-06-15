"use server";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";
import { requireStaff } from "@/lib/actions/auth-guard";

export interface ClientVisit {
  id: string;
  dateISO: string;
  serviceName: string;
  status: string;
  notes: string | null;
}

export interface ClientFileData {
  client: { name: string; phone: string };
  /** Личната бележка на изпълнителя за този клиент (формула, предпочитания). */
  note: string | null;
  visits: ClientVisit[];
}

/** Досие на клиент за текущия изпълнител: данни, лична бележка и неговите посещения (до 50). */
export async function getMyClientFile(clientId: string): Promise<ClientFileData | null> {
  const { resource } = await requireStaff();

  const [client, noteRow, visits] = await Promise.all([
    db.query.clients.findFirst({
      where: (c, { eq }) => eq(c.id, clientId),
      columns: { name: true, phone: true },
    }),
    db.query.clientNotes.findFirst({
      where: (n, { and, eq }) => and(eq(n.clientId, clientId), eq(n.resourceId, resource.id)),
    }),
    db.query.bookings.findMany({
      where: (b, { and, eq }) => and(eq(b.resourceId, resource.id), eq(b.clientId, clientId)),
      orderBy: (b, { desc }) => [desc(b.startAt)],
      limit: 50,
      columns: { id: true, startAt: true, serviceName: true, status: true, notes: true },
    }),
  ]);

  if (!client) return null;

  // Защита на личните данни: изпълнителят вижда досие САМО на клиент, с когото
  // има поне една резервация (или вече записана бележка). Иначе произволен
  // clientId би разкрил име + телефон на чужд клиент.
  if (visits.length === 0 && !noteRow) return null;

  return {
    client: { name: client.name, phone: client.phone },
    note: noteRow?.note ?? null,
    visits: visits.map((v) => ({
      id: v.id,
      dateISO: v.startAt.toISOString(),
      serviceName: v.serviceName,
      status: v.status,
      notes: v.notes,
    })),
  };
}

/** Upsert на личната бележка по (client_id, resource_id). Празна бележка изтрива реда. */
export async function saveMyClientNote(clientId: string, note: string) {
  const { resource } = await requireStaff();
  const trimmed = note.trim();

  if (trimmed === "") {
    await db
      .delete(schema.clientNotes)
      .where(and(eq(schema.clientNotes.clientId, clientId), eq(schema.clientNotes.resourceId, resource.id)));
    return { ok: true as const };
  }

  await db
    .insert(schema.clientNotes)
    .values({ id: nanoid(), clientId, resourceId: resource.id, note: trimmed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.clientNotes.clientId, schema.clientNotes.resourceId],
      set: { note: trimmed, updatedAt: new Date() },
    });
  return { ok: true as const };
}

/**
 * Изтрива контакт — САМО ако клиентът е изцяло негов (няма часове при друг
 * специалист). Изтриването на `clients` реда CASCADE-ва личните бележки, а
 * bookings.clientId става NULL (часовете остават за оборота, но без лични данни
 * → GDPR-чисто). Споделен клиент → отказ, за да не изчезне и от чуждия списък.
 */
export async function deleteMyClient(clientId: string) {
  const { resource } = await requireStaff();

  // Достъп: изпълнителят трябва да има поне 1 час с този клиент (иначе чужд clientId).
  const mine = await db.query.bookings.findFirst({
    where: (b, { and, eq }) => and(eq(b.clientId, clientId), eq(b.resourceId, resource.id)),
    columns: { id: true },
  });
  if (!mine) return { ok: false as const, error: "Нямаш достъп до този клиент." };

  // Споделен ли е? Часове при ДРУГ специалист → не трием.
  const other = await db.query.bookings.findFirst({
    where: (b, { and, eq, ne }) => and(eq(b.clientId, clientId), ne(b.resourceId, resource.id)),
    columns: { id: true },
  });
  if (other) {
    return { ok: false as const, error: "Клиентът има часове и при друг специалист — не може да се изтрие оттук." };
  }

  await db.delete(schema.clients).where(eq(schema.clients.id, clientId));
  return { ok: true as const };
}

export interface MyClientRow {
  id: string;
  name: string;
  phone: string;
  lastVisitISO: string;
  visitCount: number;
}

/** Клиентите с поне един час при този изпълнител (без отменените), сортирани по последно посещение. */
export async function getMyClients(): Promise<MyClientRow[]> {
  const { resource } = await requireStaff();

  const rows = await db.query.bookings.findMany({
    where: (b, { and, eq, ne, isNotNull }) =>
      and(eq(b.resourceId, resource.id), isNotNull(b.clientId), ne(b.status, "cancelled")),
    columns: { clientId: true, startAt: true },
  });

  const agg = new Map<string, { last: Date; count: number }>();
  for (const r of rows) {
    const id = r.clientId as string;
    const cur = agg.get(id);
    if (!cur) {
      agg.set(id, { last: r.startAt, count: 1 });
    } else {
      cur.count += 1;
      if (r.startAt > cur.last) cur.last = r.startAt;
    }
  }
  if (agg.size === 0) return [];

  const clients = await db.query.clients.findMany({
    where: (c, { inArray }) => inArray(c.id, [...agg.keys()]),
    columns: { id: true, name: true, phone: true },
  });

  return clients
    .map((c) => {
      const a = agg.get(c.id)!;
      return { id: c.id, name: c.name, phone: c.phone, lastVisitISO: a.last.toISOString(), visitCount: a.count };
    })
    .sort((x, y) => (x.lastVisitISO < y.lastVisitISO ? 1 : -1));
}
