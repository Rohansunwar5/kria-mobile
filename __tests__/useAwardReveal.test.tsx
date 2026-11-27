import { act, renderHook, waitFor } from '@testing-library/react-native';
import { buildAwards } from '@/lib/awardsView';
import { loadStates, seedIfNeeded } from '@/lib/rewardSeen';
import { useAwardReveal } from '@/lib/useAwardReveal';

jest.mock('@/lib/launchGate', () => ({ whenLaunchDone: () => Promise.resolve(), isLaunchDone: () => true }));

const awards = buildAwards({
  titles: [{ place: 'winner', tournamentId: 't1', categoryId: 'c1', tournamentName: 'Kria City Open 2026', categoryName: 'WS', awardedAt: '2026-11-24T10:00:00Z' }],
  honors: [],
  achievements: [{ id: 'matches-50', label: 'Play 50 matches', progress: 50, target: 50, earned: true }],
  knockouts: [],
  totals: { played: 50, won: 30, sports: 1 },
});
type P = { focused: boolean; blocked: boolean };
const mount = (meId: string, initial: P = { focused: true, blocked: false }) =>
  renderHook((p: P) => useAwardReveal({ meId, awards, focused: p.focused, blocked: p.blocked }), { initialProps: initial });

test('the first run seeds: no reveal, everything already earned is opened', async () => {
  const { result } = mount('first-run');
  await waitFor(() => expect(result.current.states.get('ach_matches-50')).toBe('opened'));
  expect(result.current.reveal).toBeNull();
});

test('a new award reveals once; onMinted opens it and announces the rest of the batch', async () => {
  await seedIfNeeded('p-r1', []);
  const { result } = mount('p-r1');
  await waitFor(() => expect(result.current.reveal?.key).toBe('title_t1_c1_winner'));
  await act(async () => { result.current.onMinted(); });
  await waitFor(() => expect(result.current.states.get('title_t1_c1_winner')).toBe('opened'));
  expect(result.current.states.get('ach_matches-50')).toBe('announced');
  act(() => { result.current.close(); });
  await act(async () => { await Promise.resolve(); });
  expect(result.current.reveal).toBeNull();
});

test('losing focus before the mint closes it without marking', async () => {
  await seedIfNeeded('p-r2', []);
  const { result, rerender } = mount('p-r2');
  await waitFor(() => expect(result.current.reveal).not.toBeNull());
  rerender({ focused: false, blocked: false });
  expect(result.current.reveal).toBeNull();
  expect((await loadStates('p-r2', ['title_t1_c1_winner'])).get('title_t1_c1_winner')).toBe('new');
});

test('blocked (a sheet is open) shows nothing', async () => {
  await seedIfNeeded('p-r3', []);
  const { result } = mount('p-r3', { focused: true, blocked: true });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(result.current.reveal).toBeNull();
});

test('open() clears an award\'s dot by opening its keys', async () => {
  await seedIfNeeded('p-r4', []);
  const { result } = mount('p-r4', { focused: false, blocked: false });
  await act(async () => { await result.current.open(awards.milestones[0]); });
  expect(result.current.states.get('ach_matches-50')).toBe('opened');
});
