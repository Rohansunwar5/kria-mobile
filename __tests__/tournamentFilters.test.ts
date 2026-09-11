import {
  EMPTY_FILTERS, STAGES, appliedChips, appliedCount, clearOne, toQuery,
} from '../src/lib/tournamentFilters';

describe('tournament filters', () => {
  it('starts with nothing applied', () => {
    expect(appliedCount(EMPTY_FILTERS)).toBe(0);
    expect(appliedChips(EMPTY_FILTERS)).toEqual([]);
  });

  it('counts and labels each applied filter', () => {
    const f = { sport: 'badminton', city: 'Bangalore', status: 'All' };
    expect(appliedCount(f)).toBe(2);
    expect(appliedChips(f)).toEqual([
      { key: 'sport', label: 'Badminton' },
      { key: 'city', label: 'Bangalore' },
    ]);
  });

  // The chip says what a human picked, not the enum the server takes.
  it('labels a stage with its human name, not its enum value', () => {
    expect(appliedChips({ ...EMPTY_FILTERS, status: 'registration_open' }))
      .toEqual([{ key: 'status', label: 'Open' }]);
  });

  it('clears one filter without touching the others', () => {
    const f = { sport: 'cricket', city: 'Pune', status: 'ongoing' };
    expect(clearOne(f, 'city')).toEqual({ sport: 'cricket', city: 'All', status: 'ongoing' });
  });

  // 'All' is the unfiltered sentinel and must never reach the query string —
  // the server would treat it as a literal city named "All".
  it('omits every unset filter from the query', () => {
    expect(toQuery(EMPTY_FILTERS)).toEqual({});
    expect(toQuery({ sport: 'badminton', city: 'All', status: 'ongoing' }))
      .toEqual({ sport: 'badminton', status: 'ongoing' });
  });

  // Only what getAllTournamentsValidator accepts.
  it('offers only stages the server understands', () => {
    expect(STAGES.map((s) => s.value)).toEqual([
      'registration_open', 'ongoing', 'auction_in_progress', 'completed',
    ]);
  });

  // SportConfig already has table_tennis/football/kabaddi/tennis; SPORTS
  // just hasn't grown to list them yet. The label must survive that day
  // without silently mangling to 'Table_tennis'. Tested against the value
  // directly — table_tennis is deliberately not added to SPORTS here.
  it('title-cases a multi-word sport value', () => {
    expect(appliedChips({ ...EMPTY_FILTERS, sport: 'table_tennis' }))
      .toEqual([{ key: 'sport', label: 'Table Tennis' }]);
  });

  // An empty string is as meaningless as 'All' and must not reach the query.
  it('treats an empty string the same as the sentinel', () => {
    expect(toQuery({ sport: '', city: 'All', status: 'ongoing' }))
      .toEqual({ status: 'ongoing' });
  });
});
