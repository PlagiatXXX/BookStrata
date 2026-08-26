// Формула уровней: 100 XP на уровень (перенесено из DashboardAchievements)
export const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpProgress(xp: number): number {
  return xp % XP_PER_LEVEL;
}
