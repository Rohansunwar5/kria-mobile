import { panelFor } from '@/lib/quickCricketView';
import type { QuickCricketSetup, QuickMatch } from '@/api/quickMatch';

const cricket = (setup: QuickCricketSetup): QuickMatch => ({
  _id: 'm1', hostId: 'h1', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', displayName: 'A1' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'B1' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: setup,
} as QuickMatch);

describe('panelFor', () => {
  it('sends a badminton match to the badminton panel', () => {
    const m = {
      ...cricket({ toss: { recorded: true }, lineupsSet: true, side1Lineup: [], side2Lineup: [] }),
      sport: 'badminton',
    } as QuickMatch;
    expect(panelFor(m)).toBe('badminton');
  });

  it('sends a cricket match awaiting its toss to setup', () => {
    const m = cricket({ toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] });
    expect(panelFor(m)).toBe('cricket-setup');
  });

  it('sends a cricket match awaiting its lineups to setup', () => {
    const m = cricket({
      toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
      lineupsSet: false, side1Lineup: [], side2Lineup: [],
    });
    expect(panelFor(m)).toBe('cricket-setup');
  });

  it('sends a fully set-up cricket match to the score panel', () => {
    const m = cricket({
      toss: { winnerTeamId: 's1', decision: 'bat', recorded: true },
      lineupsSet: true,
      side1Lineup: [{ slotId: 'a1' }], side2Lineup: [{ slotId: 'b1' }],
    });
    expect(panelFor(m)).toBe('cricket-score');
  });
});
