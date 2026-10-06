import {
  INITIAL_DRAFT,
  activeSlots,
  buildCreateBody,
  formatChips,
  playersBlocker,
  sideLabels,
  teamNames,
  type HostDraft,
} from '@/lib/quickHostWizard';

const host = { playerId: 'h1', displayName: 'Arjun Mehta' };
const draft = (over: Partial<HostDraft> = {}): HostDraft => ({ ...INITIAL_DRAFT, ...over });

describe('sideLabels', () => {
  it('speaks from the host when they play, neutrally when they only score', () => {
    expect(sideLabels(true)).toEqual(['Your team', 'Opponents']);
    expect(sideLabels(false)).toEqual(['Team A', 'Team B']);
  });
});

describe('activeSlots', () => {
  it('puts the host first on side 1 when they play, and trims to singles', () => {
    const [s1, s2] = activeSlots(draft({ side2: [{ displayName: 'Rahul' }, { displayName: 'Dev' }] }), host);
    expect(s1).toEqual([host]);
    expect(s2).toEqual([{ displayName: 'Rahul' }]);
  });

  it('leaves slot 1 to a named player when the host only scores', () => {
    const [s1] = activeSlots(draft({ hostPlays: false, side1: [{ displayName: 'Kiran' }, { displayName: '' }] }), host);
    expect(s1).toEqual([{ displayName: 'Kiran' }]);
  });
});

describe('teamNames', () => {
  it('builds badminton names from players: full name in singles, first names in doubles', () => {
    expect(teamNames(draft({ side2: [{ displayName: 'Rahul Singh' }, { displayName: '' }] }), host))
      .toEqual(['Arjun Mehta', 'Rahul Singh']);
    expect(teamNames(draft({
      doubles: true,
      side1: [{ displayName: '' }, { displayName: 'Priya Rao' }],
      side2: [{ displayName: 'Rahul Singh' }, { displayName: 'Dev K' }],
    }), host)).toEqual(['Arjun & Priya', 'Rahul & Dev']);
  });

  it('lets a typed team name win, and ignores one that is only spaces', () => {
    expect(teamNames(draft({ teamNames: ['Smashers', '   '], side2: [{ displayName: 'Rahul' }, { displayName: '' }] }), host))
      .toEqual(['Smashers', 'Rahul']);
  });

  it('falls back to Team A / Team B when there is nothing to build from', () => {
    expect(teamNames(draft(), host)).toEqual(['Arjun Mehta', 'Team B']);
    // Cricket never builds from players — the host's own name is not a team.
    expect(teamNames(draft({ sport: 'cricket' }), host)).toEqual(['Team A', 'Team B']);
  });
});

describe('playersBlocker', () => {
  it('blocks badminton until every player in the match is named', () => {
    expect(playersBlocker(draft(), host)).toMatch(/name every player/i);
    expect(playersBlocker(draft({ side2: [{ displayName: 'Rahul' }, { displayName: '' }] }), host)).toBeNull();
  });

  it('never blocks cricket — the squad is placeholders', () => {
    expect(playersBlocker(draft({ sport: 'cricket' }), host)).toBeNull();
  });
});

describe('formatChips', () => {
  it('reads in words, not bare numbers', () => {
    expect(formatChips(draft())).toEqual(['Singles', 'Best of 3', '21 points']);
    expect(formatChips(draft({ doubles: true, bestOf: 1 }))).toEqual(['Doubles', 'One game', '21 points']);
    expect(formatChips(draft({ sport: 'cricket', maxOvers: 10, squadSize: 7 }))).toEqual(['10 overs', '7 a side']);
  });
});

describe('buildCreateBody', () => {
  it('sends badminton exactly as before, with derived side names and trimmed slots', () => {
    const body = buildCreateBody(draft({
      side2: [{ playerId: 'p2', displayName: ' Rahul Singh ' }, { displayName: 'ignored in singles' }],
      pointsToWin: 11,
    }), host);
    expect(body).toEqual({
      sport: 'badminton',
      sides: [
        { name: 'Arjun Mehta', slots: [{ playerId: 'h1', displayName: 'Arjun Mehta' }] },
        { name: 'Rahul Singh', slots: [{ playerId: 'p2', displayName: 'Rahul Singh' }] },
      ],
      matchConfig: { bestOf: 3, pointsToWin: 11 },
      waitForPlayers: true,
    });
  });

  it('hands cricket to the existing builder with the resolved team names', () => {
    const body = buildCreateBody(draft({ sport: 'cricket', teamNames: ['Strikers', ''], squadSize: 3, maxOvers: 5 }), host);
    expect(body.sides.map((s) => s.name)).toEqual(['Strikers', 'Team B']);
    expect(body.sides[0].slots[0]).toEqual({ playerId: 'h1', displayName: 'Arjun Mehta' });
    expect(body.sides[1].slots).toHaveLength(3);
    expect(body.matchConfig).toEqual({ maxOvers: 5, playersPerTeam: 3 });
  });

  // Both sports open in the waiting room, so the code is shared before play.
  it('asks for the waiting room, whatever the sport', () => {
    expect(buildCreateBody(draft(), host).waitForPlayers).toBe(true);
    expect(buildCreateBody(draft({ sport: 'cricket' }), host).waitForPlayers).toBe(true);
  });
});
