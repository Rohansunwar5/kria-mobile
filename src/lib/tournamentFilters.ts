import { CITIES, SPORTS, STATUS_TAG } from '@/lib/tournamentConstants';

export type Filters = {
  sport: string;
  city: string;
  status: string;
};

// CITIES[0] and SPORTS[0] are each that picker's own "no filter" entry.
// `status` has no options array of its own (STAGES below lists only the
// four real stages), so it reuses the same value directly. Every check in
// this module compares against this one constant so the three keys can
// never drift onto different sentinels (e.g. `null` for one of them).
const ALL = SPORTS[0];

export const EMPTY_FILTERS: Filters = { sport: SPORTS[0], city: CITIES[0], status: ALL };

// Chip order is stable — sport, city, status — so chips do not reshuffle as
// filters are added.
const CHIP_KEYS: (keyof Filters)[] = ['sport', 'city', 'status'];

const STAGE_VALUES = ['registration_open', 'ongoing', 'auction_in_progress', 'completed'] as const;

const STAGE_TONES: Record<string, 'open' | 'live' | 'auction' | 'ended'> = {
  registration_open: 'open',
  ongoing: 'live',
  auction_in_progress: 'auction',
  completed: 'ended',
};

// Only the stages getAllTournamentsValidator accepts. Labels are sourced
// from STATUS_TAG — the same map the tournament cards read — so the sheet
// and the cards can never drift apart in wording.
export const STAGES: { value: string; label: string; tone: 'open' | 'live' | 'auction' | 'ended' }[] =
  STAGE_VALUES.map((value) => ({
    value,
    label: STATUS_TAG[value].label,
    tone: STAGE_TONES[value],
  }));

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// The chip says what a human picked, not the enum the server takes: sport
// values are lowercase enums title-cased for display, status values are
// looked up in STATUS_TAG for their human label, and city is already
// display-cased in CITIES so it passes through unchanged.
function chipLabel(key: keyof Filters, value: string): string {
  if (key === 'status') {
    const tag = STATUS_TAG[value];
    return tag ? tag.label : value;
  }
  if (key === 'sport') {
    return titleCase(value);
  }
  return value;
}

export function appliedChips(f: Filters): { key: keyof Filters; label: string }[] {
  return CHIP_KEYS
    .filter((key) => f[key] !== ALL)
    .map((key) => ({ key, label: chipLabel(key, f[key]) }));
}

export function appliedCount(f: Filters): number {
  return CHIP_KEYS.filter((key) => f[key] !== ALL).length;
}

export function clearOne(f: Filters, key: keyof Filters): Filters {
  return { ...f, [key]: ALL };
}

// 'All' is the unfiltered sentinel and must never reach the query string —
// the server would treat it as a literal city named "All" — so each key is
// checked individually against the sentinel rather than assumed.
export function toQuery(f: Filters): { sport?: string; city?: string; status?: string } {
  const query: { sport?: string; city?: string; status?: string } = {};
  if (f.sport !== ALL) query.sport = f.sport;
  if (f.city !== ALL) query.city = f.city;
  if (f.status !== ALL) query.status = f.status;
  return query;
}
