import { categoryLinks, detailPhase, entryFrom } from '../src/lib/tournamentDetail';
import type { Category } from '../src/store/slices/registrationSlice';

const cat = (over: Partial<Category> = {}): Category =>
  ({ _id: 'c1', name: 'Gold Cup', status: 'completed', bracketType: 'knockout', isPaidRegistration: false, registrationFee: 0, ...over }) as Category;

const labels = (links: { label: string }[]) => links.map((l) => l.label);

describe('detailPhase', () => {
  it('leads with the result once over, entry while open, play otherwise', () => {
    expect(detailPhase('completed')).toBe('result');
    expect(detailPhase('cancelled')).toBe('result');
    expect(detailPhase('registration_open')).toBe('entry');
    expect(detailPhase('ongoing')).toBe('play');
    expect(detailPhase('auction_in_progress')).toBe('play');
  });
});

describe('entryFrom', () => {
  it('is Free when any category is, else the lowest fee', () => {
    expect(entryFrom([cat({ isPaidRegistration: true, registrationFee: 500 }), cat()])).toBe('Free');
    expect(entryFrom([cat({ isPaidRegistration: true, registrationFee: 500 }), cat({ isPaidRegistration: true, registrationFee: 300 })])).toBe('₹300');
    expect(entryFrom([])).toBeNull();
  });
});

describe('categoryLinks', () => {
  // The Draw and Auction tabs are gone; every place a category leads must
  // still be one tap from its card.
  it('keeps a finished auction reachable after the category moves on', () => {
    expect(labels(categoryLinks(cat(), 't1', 'completed'))).toEqual(['Bracket', 'Standings', 'Auction']);
  });

  it('leads with a live auction, with the draw still reachable under it', () => {
    const links = categoryLinks(cat({ status: 'auction' }), 't1', 'in_progress');
    expect(labels(links)).toEqual(['Auction live', 'Bracket', 'Standings']);
    expect(links[0].live).toBe(true);
  });

  it('hands a finished auction category over to its draw', () => {
    expect(labels(categoryLinks(cat({ status: 'auction' }), 't1', 'completed'))).toEqual(['Bracket', 'Auction', 'Standings']);
  });

  it('offers nothing before the category is drawn and never auctioned', () => {
    expect(categoryLinks(cat({ status: 'registration' }), 't1')).toEqual([]);
  });

  it('sends a team league to its table and cricket to its own standings', () => {
    expect(labels(categoryLinks(cat({ bracketType: 'team_league' }), 't1'))).toEqual(['League', 'Standings']);
    expect(categoryLinks(cat({ sport: 'cricket' }), 't1').find((l) => l.label === 'Standings')?.href).toBe('/cricket/leaderboard/c1');
  });
});
