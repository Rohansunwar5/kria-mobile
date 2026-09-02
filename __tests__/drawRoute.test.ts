import { drawDestination } from '../src/lib/drawRoute';
import type { Category } from '../src/store/slices/registrationSlice';

const cat = (over: Partial<Category>): Category =>
  ({
    _id: 'c1',
    tournamentId: 't1',
    name: 'Mixed Doubles',
    gender: 'Mixed',
    maxParticipants: 32,
    isPaidRegistration: false,
    registrationFee: 0,
    status: 'registration_open',
    isActive: true,
    ...over,
  }) as Category;

describe('drawDestination', () => {
  it('sends a category with a running auction to the auction room', () => {
    const d = drawDestination(cat({ status: 'auction_in_progress' }), 't1');
    expect(d.kind).toBe('auction');
    expect(d.href).toBe('/auction/t1/c1');
  });

  it('sends a team-league category to the league view once play starts', () => {
    const d = drawDestination(cat({ status: 'ongoing', bracketType: 'team_league' }), 't1');
    expect(d.kind).toBe('teamLeague');
    expect(d.href).toBe('/team-league/t1/c1');
  });

  it('sends every other in-play category to the bracket', () => {
    const d = drawDestination(cat({ status: 'ongoing', bracketType: 'knockout' }), 't1');
    expect(d.kind).toBe('bracket');
    expect(d.href).toBe('/bracket/t1/c1');
  });

  it('prefers the live auction over the league view while the auction runs', () => {
    // A team-league category still auctions its players first.
    const d = drawDestination(cat({ status: 'auction_in_progress', bracketType: 'team_league' }), 't1');
    expect(d.kind).toBe('auction');
  });

  it('has no destination before the draw exists', () => {
    expect(drawDestination(cat({ status: 'registration_open' }), 't1').kind).toBe('none');
    expect(drawDestination(cat({ status: 'draft' }), 't1').kind).toBe('none');
  });

  it('keeps a completed category reachable so results stay readable', () => {
    expect(drawDestination(cat({ status: 'completed', bracketType: 'knockout' }), 't1').kind).toBe('bracket');
  });
});
