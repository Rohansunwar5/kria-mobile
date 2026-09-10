import type { CreateQuickMatchBody } from '@/api/quickMatch';

export interface CricketCreateInput {
  side1Name: string;
  side2Name: string;
  maxOvers: number;
  squadSize: number;
}

/** Ranges mirror the server validator, so a bad config is caught inline
 *  rather than coming back as a 422. */
export function validateCricketConfig(input: { maxOvers: number; squadSize: number }): string | null {
  if (!Number.isInteger(input.maxOvers) || input.maxOvers < 1 || input.maxOvers > 50) {
    return 'Overs must be between 1 and 50.';
  }
  if (!Number.isInteger(input.squadSize) || input.squadSize < 2 || input.squadSize > 11) {
    return 'Squad size must be between 2 and 11.';
  }
  return null;
}

/**
 * The create payload for a quick cricket match.
 *
 * One slot per squad member on each side, because the batting order is DERIVED
 * from slots and never typed fresh — see `lineupFromSlots` and spec §2. A side
 * created with fewer slots than its squad simply cannot field them.
 *
 * `maxOversPerBowler` is deliberately not sent: a casual host does not think in
 * bowler quotas, and the server default of 4 is harmless.
 */
export function buildCricketCreateBody(input: CricketCreateInput): CreateQuickMatchBody {
  const slots = () => Array.from({ length: input.squadSize }, (_unused, i) => ({
    displayName: `Player ${i + 1}`,
  }));

  return {
    sport: 'cricket',
    sides: [
      { name: input.side1Name, slots: slots() },
      { name: input.side2Name, slots: slots() },
    ],
    matchConfig: { maxOvers: input.maxOvers, playersPerTeam: input.squadSize },
  };
}
