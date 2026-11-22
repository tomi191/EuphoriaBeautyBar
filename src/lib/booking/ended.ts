/**
 * «Приключил» изпълнител: админът е приключил сътрудничеството (endCooperation) → скрит и без
 * вход (входът е изтрит, userId е празно). Различно от «Скрит» (active=false, входът стои):
 * скритият работи, само не излиза пред клиентите и не приема онлайн записи, затова пази
 * /staff, Telegram, известията и вечерната си сводка.
 */
export const isEnded = (r: { active: boolean; userId: string | null }): boolean => !r.active && !r.userId;
