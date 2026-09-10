import { buildCricketCreateBody, validateCricketConfig } from '@/lib/quickCricketCreate';

describe('buildCricketCreateBody', () => {
  it('generates one slot per squad member on each side', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 6,
    });

    expect(body.sides).toHaveLength(2);
    expect(body.sides[0].slots).toHaveLength(6);
    expect(body.sides[1].slots).toHaveLength(6);
  });

  it('names the generated slots so the host can see and rename them', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 2,
    });

    expect(body.sides[0].slots.map((s) => s.displayName)).toEqual(['Player 1', 'Player 2']);
  });

  it('sends sport cricket with the chosen overs and squad size', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 6,
    });

    expect(body.sport).toBe('cricket');
    expect(body.matchConfig).toEqual({ maxOvers: 8, playersPerTeam: 6 });
  });

  // A casual host does not think in bowler quotas; the server default of 4
  // stands. Asserted so a later edit does not quietly start sending it.
  it('does not send maxOversPerBowler', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 6,
    });

    expect(body.matchConfig && 'maxOversPerBowler' in body.matchConfig).toBe(false);
  });

  it('carries the side names through', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Sunday XI', side2Name: 'The Rest', maxOvers: 6, squadSize: 3,
    });

    expect(body.sides.map((s) => s.name)).toEqual(['Sunday XI', 'The Rest']);
  });
});

// Ranges mirror the server validator added in Task 1, so the host gets an
// inline message instead of a 422.
describe('validateCricketConfig', () => {
  it('accepts a sensible casual config', () => {
    expect(validateCricketConfig({ maxOvers: 8, squadSize: 6 })).toBeNull();
  });

  it('rejects zero overs', () => {
    expect(validateCricketConfig({ maxOvers: 0, squadSize: 6 })).toMatch(/overs/i);
  });

  it('rejects more than 50 overs', () => {
    expect(validateCricketConfig({ maxOvers: 51, squadSize: 6 })).toMatch(/overs/i);
  });

  it('rejects a squad of one', () => {
    expect(validateCricketConfig({ maxOvers: 8, squadSize: 1 })).toMatch(/squad/i);
  });

  it('rejects a squad above 11', () => {
    expect(validateCricketConfig({ maxOvers: 8, squadSize: 12 })).toMatch(/squad/i);
  });
});
