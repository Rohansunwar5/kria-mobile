export const SPORT_LABELS: Record<string, string> = {
  badminton: 'Badminton',
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
  tennis: 'Tennis',
  kabaddi: 'Kabaddi',
};

/** Glyph per sport, for history rows and roster headers. */
export const SPORT_ICON: Record<string, 'shuttlecock' | 'ball' | 'court'> = {
  badminton: 'shuttlecock',
  cricket: 'ball',
  table_tennis: 'court',
  tennis: 'court',
};

/**
 * Which sports a tournament actually hosts.
 *
 * The server keeps both `sport` (legacy, single, defaults to 'badminton') and
 * `sports` (the real list for a multisport tournament). Reading `sport` alone is
 * why a multisport tournament showed only a badminton tag.
 */
export function tournamentSports(t?: { sport?: string; sports?: string[] }): string[] {
  if (t?.sports?.length) return t.sports;
  return t?.sport ? [t.sport] : [];
}

/** A team-league tie is a container for its sub-matches — never a live card. */
export function isLiveMatch(m: { status?: string; isTie?: boolean }): boolean {
  return m.status === 'in_progress' && !m.isTie;
}
