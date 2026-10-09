import { useEffect, useState } from 'react';
import type { Category } from '@/store/slices/registrationSlice';
import { getCategoryBracket } from '@/api/match';
import { getAuctionStatus } from '@/api/auction';
import { finalResult, type FinalResult } from '@/lib/bracketView';
import type { AuctionState } from '@/lib/drawRoute';

/**
 * Per category: the decided final, if any, and the auction's state, if it
 * ran one. One load for the whole detail page — the champion card, the
 * category buttons and the team grid's trophy all read it.
 *
 * Each request fails on its own: a category whose bracket or auction does not
 * load simply has no entry, and the rest still render.
 */
export function useCategoryExtras(tournamentId: string | undefined, categories: Category[]) {
  const [finals, setFinals] = useState<Record<string, FinalResult>>({});
  const [auctions, setAuctions] = useState<Record<string, AuctionState>>({});
  const key = categories.map((c) => `${c._id}:${c.status}`).join(',');

  useEffect(() => {
    if (!tournamentId || categories.length === 0) return;
    let active = true;

    Promise.all(
      categories.map((c) =>
        getCategoryBracket(c._id)
          .then((b) => {
            const f = finalResult(b.matches ?? [], b.competitorType);
            return f ? ([c._id, f] as const) : null;
          })
          .catch(() => null),
      ),
    ).then((found) => {
      if (active) setFinals(Object.fromEntries(found.filter((x) => x !== null)));
    });

    Promise.all(
      categories.map((c) =>
        getAuctionStatus(tournamentId, c._id)
          .then((r) => (r?.auction?.status ? ([c._id, r.auction.status as AuctionState] as const) : null))
          .catch(() => null),
      ),
    ).then((found) => {
      if (active) setAuctions(Object.fromEntries(found.filter((x) => x !== null)));
    });

    return () => { active = false; };
    // `key` stands in for `categories`: a new array with the same ids and
    // statuses must not refetch every bracket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, key]);

  return { finals, auctions };
}
