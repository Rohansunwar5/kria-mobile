export const SPORT_LABELS: Record<string, string> = {
  badminton: 'Badminton',
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
  tennis: 'Tennis',
  kabaddi: 'Kabaddi',
  volleyball: 'Volleyball',
  basketball: 'Basketball',
};

/**
 * Sports `GET /player/rankings` accepts: every sport a match can be played in,
 * tournament or quick. The server ranks straight from the participation ledger,
 * so this is the same list as the Host flow's sports.
 */
export const RANKED_SPORTS = ['badminton', 'cricket', 'table_tennis'];

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

/**
 * Onboarding's "What do you play most?" list: the ranked (live) sports first,
 * then sports Kria doesn't run yet. Those can still be picked as a main sport;
 * Home and Profile already say "Kria doesn't rank X yet" for them.
 */
export const ONBOARDING_SPORTS = [...RANKED_SPORTS, 'football', 'tennis', 'kabaddi', 'volleyball', 'basketball'];
