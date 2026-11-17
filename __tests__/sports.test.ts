import { tournamentSports } from '../src/lib/sports';

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

describe('ONBOARDING_SPORTS', () => {
  it('lists the three live sports first, then the five coming ones, all labelled', () => {
    const { ONBOARDING_SPORTS, SPORT_LABELS } = jest.requireActual('../src/lib/sports');
    expect(ONBOARDING_SPORTS).toEqual(['badminton', 'cricket', 'table_tennis', 'football', 'tennis', 'kabaddi', 'volleyball', 'basketball']);
    for (const k of ONBOARDING_SPORTS) expect(SPORT_LABELS[k]).toBeTruthy();
  });
});
