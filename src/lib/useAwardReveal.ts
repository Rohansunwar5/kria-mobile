import { useCallback, useEffect, useState } from 'react';
import { nextReveal, type Award, type buildAwards } from '@/lib/awardsView';
import { whenLaunchDone } from '@/lib/launchGate';
import { loadStates, markAnnounced, markOpened, seedIfNeeded, type RewardState } from '@/lib/rewardSeen';

type Awards = Pick<ReturnType<typeof buildAwards>, 'titles' | 'honours' | 'knockouts' | 'milestones'>;
type Reveal = { award: Award; key: string; batch: string[] };

const earnedKeys = (a: Awards) => [...a.titles, ...a.honours, ...a.knockouts, ...a.milestones].filter((x) => x.earned).flatMap((x) => x.seenKeys);

/**
 * Which award to reveal on this screen, if any (reward spec C3). Runs only
 * while the screen is focused, nothing else is open, and the launch overlay
 * is gone. The first run for a player seeds everything already earned as
 * opened. `onMinted` (from AwardReveal, at the mint or on an early close)
 * opens the revealed award and announces the rest of its batch, so they wait
 * as "New" instead of revealing one by one. Losing focus first closes the
 * reveal unmarked, to play again later. `open` clears an award's dot.
 */
export function useAwardReveal({ meId, awards, focused, blocked }: { meId: string; awards: Awards | null; focused: boolean; blocked: boolean }) {
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [states, setStates] = useState<Map<string, RewardState>>(() => new Map());

  // Focus lost: close during render (React's "previous value" pattern), unmarked.
  const [wasFocused, setWasFocused] = useState(focused);
  if (focused !== wasFocused) {
    setWasFocused(focused);
    if (!focused && reveal) setReveal(null);
  }

  const keys = awards ? earnedKeys(awards) : [];
  const sig = keys.join('|');
  useEffect(() => {
    if (!meId || !awards || !focused || blocked || reveal) return;
    let alive = true;
    (async () => {
      await whenLaunchDone();
      const seeded = await seedIfNeeded(meId, keys);
      const st = await loadStates(meId, keys);
      if (!alive) return;
      setStates(st);
      if (!seeded) setReveal(nextReveal(awards, st));
    })().catch(() => {});
    return () => {
      alive = false;
    };
    // `awards` is rebuilt every render; its earned keys (sig) are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, sig, focused, blocked, reveal]);

  const refresh = useCallback(async () => {
    if (awards) setStates(await loadStates(meId, earnedKeys(awards)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, sig]);

  const onMinted = useCallback(() => {
    if (!reveal) return;
    Promise.all([markOpened(meId, [reveal.key]), markAnnounced(meId, reveal.batch.filter((k) => k !== reveal.key))])
      .then(refresh, () => {});
  }, [meId, reveal, refresh]);

  const close = useCallback(() => setReveal(null), []);

  const open = useCallback(async (award: Award) => {
    if (!award.seenKeys.length) return;
    await markOpened(meId, award.seenKeys);
    await refresh();
  }, [meId, refresh]);

  return { reveal, states, onMinted, close, open };
}
