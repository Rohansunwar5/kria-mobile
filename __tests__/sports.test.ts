import { tournamentSports, isLiveMatch } from '../src/lib/sports';

describe('tournamentSports', () => {
  it('uses the sports array for a multisport tournament', () => {
    expect(tournamentSports({ sport: 'badminton', sports: ['badminton', 'cricket'] })).toEqual([
      'badminton',
      'cricket',
    ]);
  });

  it('falls back to the legacy single sport', () => {
    // `sport` defaults to badminton server-side, so an empty `sports` array must
    // not win — that is what showed one badminton tag on a multisport tournament.
    expect(tournamentSports({ sport: 'cricket', sports: [] })).toEqual(['cricket']);
    expect(tournamentSports({ sport: 'cricket' })).toEqual(['cricket']);
  });

  it('returns nothing when the tournament has no sport at all', () => {
    expect(tournamentSports(undefined)).toEqual([]);
    expect(tournamentSports({})).toEqual([]);
  });
});

describe('isLiveMatch', () => {
  it('accepts an in-progress match', () => {
    expect(isLiveMatch({ status: 'in_progress' })).toBe(true);
  });

  it('rejects anything not in progress', () => {
    expect(isLiveMatch({ status: 'completed' })).toBe(false);
    expect(isLiveMatch({ status: 'scheduled' })).toBe(false);
  });

  it('rejects a team-league tie parent — it is a container, not a playable match', () => {
    expect(isLiveMatch({ status: 'in_progress', isTie: true })).toBe(false);
  });
});
