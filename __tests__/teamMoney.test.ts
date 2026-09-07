import { teamSpent } from '../src/lib/auctionView';

describe('teamSpent', () => {
  it('derives spend from the budget the auction has drawn down', () => {
    // The server stores `budget` (remaining) and `initialBudget`. There is no
    // `totalSpent` on a team document — reading one showed an empty figure.
    expect(teamSpent({ budget: 4000, initialBudget: 10000 })).toBe(6000);
  });

  it('is zero before the team has bought anyone', () => {
    expect(teamSpent({ budget: 10000, initialBudget: 10000 })).toBe(0);
  });

  it('never goes negative if a budget was raised after the auction', () => {
    expect(teamSpent({ budget: 12000, initialBudget: 10000 })).toBe(0);
  });

  it('is zero when the team carries no budget fields at all', () => {
    expect(teamSpent({})).toBe(0);
    expect(teamSpent(undefined)).toBe(0);
  });
});
