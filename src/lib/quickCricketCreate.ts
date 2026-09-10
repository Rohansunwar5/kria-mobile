import type { CreateQuickMatchBody } from '@/api/quickMatch';

export interface CricketCreateInput {
  side1Name: string;
  side2Name: string;
  maxOvers: number;
  squadSize: number;
  /** The logged-in host. May be absent, matching badminton's `user?._id`. */
  hostPlayerId?: string;
  hostName: string;
  /**
   * Is the host one of the players, or only keeping score?
   *
   * Career credit is written from `sides[].slots[].playerId`, so this decides
   * whether the host earns figures for the match. A host who only scores must
   * not be credited with a match they did not play, and a host who IS playing
   * must not be silently left out. The screen offers the choice and defaults
   * to `true`.
   */
  hostPlays: boolean;
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
 * Side 1's first slot is the host — carrying `playerId` — only when
 * `hostPlays`. Career credit is written from `sides[].slots[].playerId` and
 * nothing else, so that flag is what decides whether the host earns figures:
 * a host slot with no `playerId` would score the match while crediting nobody,
 * and a host slotted when they were only keeping score would earn a record for
 * a match they never played. Every other slot stays a generated placeholder
 * with the `playerId` key left absent (not `undefined`) so it matches the
 * server's optional field.
 *
 * The squad size is unchanged either way, so the slot a scoring host does not
 * take remains claimable by whoever actually plays — and the host can still
 * claim one later by join code if they change their mind, since they are not
 * an occupant.
 *
 * `maxOversPerBowler` is deliberately not sent: a casual host does not think in
 * bowler quotas, and the server default of 4 is harmless.
 */
export function buildCricketCreateBody(input: CricketCreateInput): CreateQuickMatchBody {
  const placeholders = (count: number, startAt: number) => Array.from(
    { length: count },
    (_unused, i) => ({ displayName: `Player ${startAt + i}` }),
  );

  const side1Slots = input.hostPlays
    ? [
      { playerId: input.hostPlayerId, displayName: input.hostName },
      ...placeholders(input.squadSize - 1, 2),
    ]
    : placeholders(input.squadSize, 1);
  const side2Slots = placeholders(input.squadSize, 1);

  return {
    sport: 'cricket',
    sides: [
      { name: input.side1Name, slots: side1Slots },
      { name: input.side2Name, slots: side2Slots },
    ],
    matchConfig: { maxOvers: input.maxOvers, playersPerTeam: input.squadSize },
  };
}
