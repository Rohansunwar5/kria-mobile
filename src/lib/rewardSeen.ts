import type { Title } from '@/api/profileApi';
import type { Honor } from '@/lib/badges';
import { getItem, setItem } from '@/lib/secureStore';

/**
 * "Already seen" for award reveals (reward spec C1–C2). Each earned award has
 * a stable key built from raw data (the Awards grid's own keys are list
 * positions), and one of three states per player:
 * - new: never celebrated — a reveal candidate, shows a "New" dot;
 * - announced: a reveal already played for its batch — never revealed again, still dotted;
 * - opened: seen full-screen or in its sheet — no dot.
 * One secure-store key per award and state (values stay tiny); a session
 * cache spares the store on every focus.
 */
export type RewardState = 'new' | 'announced' | 'opened';
export type SeenSource =
  | { kind: 'achievement'; id: string }
  | { kind: 'title'; title: Pick<Title, 'place' | 'tournamentId' | 'categoryId'> }
  | { kind: 'honour'; honor: Pick<Honor, 'title' | 'badge' | 'ref' | 'tournamentId'> };

// Same value as awardsView's KNOCKOUT_BADGE; not imported, as awardsView imports this file.
const KNOCKOUT_BADGE = 'knockout-winner';
const clean = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);

/** Null for an award with no stable identity (a legacy title, a knockout win without its knockout). */
export function awardSeenKey(src: SeenSource): string | null {
  if (src.kind === 'achievement') return clean(`ach_${src.id}`);
  if (src.kind === 'title') {
    const { tournamentId, categoryId, place } = src.title;
    return tournamentId && categoryId ? clean(`title_${tournamentId}_${categoryId}_${place}`) : null;
  }
  const h = src.honor;
  if (h.badge === KNOCKOUT_BADGE) return h.ref ? clean(`ko_${h.ref}`) : null;
  // Mirrors the server's honour identity (title, badge, ref | tournamentId).
  return clean(`hon_${h.badge}_${h.ref ?? h.tournamentId ?? ''}_${h.title}`);
}

const cache = new Map<string, Map<string, RewardState>>();
const mine = (meId: string) => {
  let m = cache.get(meId);
  if (!m) cache.set(meId, (m = new Map()));
  return m;
};
const openedKey = (meId: string, key: string) => clean(`seen_${meId}_${key}`);
const announcedKey = (meId: string, key: string) => clean(`ann_${meId}_${key}`);

export async function loadStates(meId: string, keys: string[]): Promise<Map<string, RewardState>> {
  const m = mine(meId);
  await Promise.all(keys.filter((k) => !m.has(k)).map(async (k) => {
    const [opened, announced] = await Promise.all([getItem(openedKey(meId, k)), getItem(announcedKey(meId, k))]);
    m.set(k, opened ? 'opened' : announced ? 'announced' : 'new');
  }));
  return new Map(keys.map((k) => [k, m.get(k) ?? 'new']));
}

export async function markAnnounced(meId: string, keys: string[]): Promise<void> {
  const m = mine(meId);
  await Promise.all(keys.filter((k) => m.get(k) !== 'opened').map(async (k) => {
    m.set(k, 'announced');
    await setItem(announcedKey(meId, k), '1');
  }));
}

/** Opened implies announced. */
export async function markOpened(meId: string, keys: string[]): Promise<void> {
  const m = mine(meId);
  await Promise.all(keys.map(async (k) => {
    m.set(k, 'opened');
    await Promise.all([setItem(openedKey(meId, k), '1'), setItem(announcedKey(meId, k), '1')]);
  }));
}

/**
 * First run of reveals for this player: everything already earned counts as
 * opened, so an existing account gets no flood of reveals or dots. True when
 * it seeded (no reveal this time).
 */
export async function seedIfNeeded(meId: string, earnedKeys: string[]): Promise<boolean> {
  const flag = clean(`seen_seeded_${meId}`);
  if (await getItem(flag)) return false;
  await markOpened(meId, earnedKeys);
  await setItem(flag, '1');
  return true;
}

/** Forget the session cache (tests; a sign-out may call it too). */
export function resetRewardCache(): void {
  cache.clear();
}
