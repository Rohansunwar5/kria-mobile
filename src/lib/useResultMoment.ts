import { useEffect, useRef, useState } from 'react';
import { getCareerProfile, type CareerProfile } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import { buildResultMoment, viewerSide, type ResultMoment } from '@/lib/resultMoment';
import { markOpened } from '@/lib/rewardSeen';

const RALLY = ['badminton', 'table_tennis'];
const RETRY_MS = 1500;

/**
 * The match-result moment for a claimed player who watched the match finish
 * in the room (reward spec §7). Career is read when the room opens (match
 * waiting or live) and again on the change to completed; the moment shows
 * only when the two differ by exactly this match, with one retry 1.5s later
 * for a server still writing. It plays once: a second completion (the host
 * undid the last point) or a match opened already finished shows the plain
 * result. `suppress` lets the knockout-host redirect win.
 */
export function useResultMoment({ match, meId, suppress }: { match: QuickMatch | null; meId: string; suppress: boolean }) {
  const status = match?.status;
  const eligible = !!match && !suppress && RALLY.includes(match.sport) && viewerSide(match, meId) !== null;

  // Count live → completed changes during render (React's "previous value" pattern):
  // the first one is this match's moment, any later one is an undo-and-finish.
  const [prev, setPrev] = useState(status);
  const [completions, setCompletions] = useState(0);
  if (status !== prev) {
    setPrev(status);
    if (prev === 'live' && status === 'completed') setCompletions((n) => n + 1);
  }

  const [before, setBefore] = useState<CareerProfile | null>(null);
  const asked = useRef(false);
  useEffect(() => {
    if (!eligible || asked.current || (status !== 'waiting' && status !== 'live')) return;
    asked.current = true;
    getCareerProfile(meId).then(setBefore, () => {});
  }, [eligible, status, meId]);

  const [moment, setMoment] = useState<ResultMoment | null>(null);
  useEffect(() => {
    if (completions !== 1 || !eligible || !before || !match) return;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const read = (last: boolean) =>
      getCareerProfile(meId).then(
        (after) => {
          if (!alive) return;
          const m = buildResultMoment(before, after, match, meId);
          if (m) {
            setMoment(m);
            if (m.minted) markOpened(meId, [`ach_${m.minted.id}`]).catch(() => {});
          } else if (!last) retry = setTimeout(() => read(true), RETRY_MS);
        },
        () => {},
      );
    read(false);
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
    };
    // Runs once per first completion; the match object updates often after it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions, eligible, before, meId]);

  const showing = completions === 1 && status === 'completed' ? moment : null;
  return { moment: showing, play: !!showing };
}
