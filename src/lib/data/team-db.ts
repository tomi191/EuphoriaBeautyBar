import { db } from "@/lib/db";
import { team as fallbackTeam, type TeamMember } from "@/lib/data/team";

/**
 * Екипът на публичния сайт идва от базата: админът го редактира на /admin/team
 * и actions/team.ts ревалидира страниците, които го показват. Статичният team.ts
 * остава fallback при празна или недостъпна БД, за да не остане /za-nas без
 * основателя. Модел като faq-db.ts.
 *
 * Отделен файл, а НЕ в team.ts: `@/lib/db` хвърля при import без DATABASE_URL,
 * а team.ts се чете и от seed скриптове.
 */
const DEFAULT_IMAGE = "/images/team/snezhana.jpg";

export async function getTeam(): Promise<TeamMember[]> {
  try {
    const rows = await db.query.teamMembers.findMany({
      where: (t, { eq }) => eq(t.active, true),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
    });
    if (!rows.length) return fallbackTeam;
    const mapped = rows.map((r) => {
      // Снимките от статичния файл (вкл. кадъра в салона) не са колони в БД,
      // затова ги взимаме по slug, за да не се губят при DB четене.
      const staticMember = fallbackTeam.find((m) => m.slug === r.slug);
      return {
        slug: r.slug,
        name: r.name,
        role: r.role,
        bio: r.bio,
        image: r.image || staticMember?.image || DEFAULT_IMAGE,
        imageSalon: staticMember?.imageSalon,
        experience: r.experience,
        specialties: r.specialties ?? [],
      };
    });
    // Основателят винаги е първи (потребителите ползват team[0] като „лицето“ на
    // страницата), независимо от sortOrder на нов член, добавен от админа.
    const founderSlug = fallbackTeam[0]?.slug;
    return [...mapped.filter((m) => m.slug === founderSlug), ...mapped.filter((m) => m.slug !== founderSlug)];
  } catch {
    return fallbackTeam;
  }
}

export async function getTeamMember(slug: string): Promise<TeamMember | undefined> {
  const all = await getTeam();
  return all.find((m) => m.slug === slug);
}
