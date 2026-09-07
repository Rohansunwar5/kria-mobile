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
    status: 'registration',
    isActive: true,
    ...over,
  }) as Category;

describe('drawDestination', () => {
  it('sends a category with a running auction to the auction room', () => {
    const d = drawDestination(cat({ status: 'auction' }), 't1');
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

  it('opens the draw as soon as fixtures exist, before play starts', () => {
    expect(drawDestination(cat({ status: 'bracket_configured', bracketType: 'knockout' }), 't1').kind).toBe('bracket');
    expect(drawDestination(cat({ status: 'groups_configured', bracketType: 'team_league' }), 't1').kind).toBe('teamLeague');
  });

  it('prefers the live auction over the league view while the auction runs', () => {
    // A team-league category still auctions its players first.
    const d = drawDestination(cat({ status: 'auction', bracketType: 'team_league' }), 't1');
    expect(d.kind).toBe('auction');
  });

  it('has no destination before the draw exists', () => {
    expect(drawDestination(cat({ status: 'registration' }), 't1').kind).toBe('none');
    expect(drawDestination(cat({ status: 'setup' }), 't1').kind).toBe('none');
  });

  it('keeps a completed category reachable so results stay readable', () => {
    expect(drawDestination(cat({ status: 'completed', bracketType: 'knockout' }), 't1').kind).toBe('bracket');
  });
});

describe('auction state on the category row', () => {
  const { drawDestination, drawSecondary, auctionTag } = require('../src/lib/drawRoute');
  const auctionCat = (over = {}) => cat({ status: 'auction', bracketType: 'knockout', ...over });

  it('keeps the auction as the main row while it runs', () => {
    expect(drawDestination(auctionCat(), 't1', 'in_progress').kind).toBe('auction');
    expect(drawDestination(auctionCat(), 't1', 'sold').kind).toBe('auction');
    expect(drawDestination(auctionCat(), 't1', 'paused').kind).toBe('auction');
  });

  it('assumes the auction is running when its state is not known yet', () => {
    // The row must not flicker to the bracket while the status request is in flight.
    expect(drawDestination(auctionCat(), 't1').kind).toBe('auction');
  });

  it('hands the row to the draw once the auction is over', () => {
    // The organiser may never advance the category past 'auction', so the auction
    // ending is what promotes the draw — not the category status.
    const d = drawDestination(auctionCat(), 't1', 'completed');
    expect(d.kind).toBe('bracket');
    expect(d.href).toBe('/bracket/t1/c1');
    expect(drawDestination(auctionCat({ bracketType: 'team_league' }), 't1', 'completed').kind).toBe('teamLeague');
  });

  it('labels the row by what the auction is actually doing', () => {
    expect(auctionTag('in_progress')).toEqual({ label: 'Auction live', short: 'Live', live: true });
    expect(auctionTag('sold')).toEqual({ label: 'Auction live', short: 'Live', live: true });
    expect(auctionTag('paused')).toEqual({ label: 'Auction paused', short: 'Paused', live: false });
    expect(auctionTag('completed')).toEqual({ label: 'Auction ended', short: 'Ended', live: false });
    expect(auctionTag('not_started')).toEqual({ label: 'Auction not started', short: 'Soon', live: false });
    expect(auctionTag(undefined)).toEqual({ label: 'Auction live', short: 'Live', live: true });
  });
});

describe('drawSecondary', () => {
  const { drawSecondary } = require('../src/lib/drawRoute');

  it('offers the draw under a running auction — a bracket can exist before the auction closes', () => {
    // Observed live: a cricket category sat at 'auction' with matches already in
    // progress, and the draw was unreachable because the auction won the row.
    expect(drawSecondary(cat({ status: 'auction', bracketType: 'knockout' }), 't1', 'in_progress')).toEqual([
      { label: 'Bracket', href: '/bracket/t1/c1' },
    ]);
    expect(drawSecondary(cat({ status: 'auction', bracketType: 'team_league' }), 't1', 'paused')).toEqual([
      { label: 'League table', href: '/team-league/t1/c1' },
    ]);
  });

  it('keeps the sold log reachable once the draw takes the main row', () => {
    expect(drawSecondary(cat({ status: 'auction', bracketType: 'knockout' }), 't1', 'completed')).toEqual([
      { label: 'Auction result', href: '/auction/t1/c1' },
    ]);
  });

  it('offers nothing extra for a category that never had an auction row', () => {
    expect(drawSecondary(cat({ status: 'ongoing', bracketType: 'knockout' }), 't1')).toEqual([]);
    expect(drawSecondary(cat({ status: 'registration' }), 't1')).toEqual([]);
  });
});
