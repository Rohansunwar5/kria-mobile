import { buildCricketCreateBody, validateCricketConfig } from '@/lib/quickCricketCreate';

describe('buildCricketCreateBody', () => {
  it('generates one slot per squad member on each side', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 6,
      hostPlayerId: 'host-1', hostName: 'Host',
      hostPlays: true,
    });

    expect(body.sides).toHaveLength(2);
    expect(body.sides[0].slots).toHaveLength(6);
    expect(body.sides[1].slots).toHaveLength(6);
  });

  it('names the generated slots so the host can see and rename them', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 2,
      hostPlayerId: 'host-1', hostName: 'Host',
      hostPlays: true,
    });

    expect(body.sides[0].slots.map((s) => s.displayName)).toEqual(['Host', 'Player 2']);
    expect(body.sides[1].slots.map((s) => s.displayName)).toEqual(['Player 1', 'Player 2']);
  });

  it('sends sport cricket with the chosen overs and squad size', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 6,
      hostPlayerId: 'host-1', hostName: 'Host',
      hostPlays: true,
    });

    expect(body.sport).toBe('cricket');
    expect(body.matchConfig).toEqual({ maxOvers: 8, playersPerTeam: 6 });
  });

  // A casual host does not think in bowler quotas; the server default of 4
  // stands. Asserted so a later edit does not quietly start sending it.
  it('does not send maxOversPerBowler', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 6,
      hostPlayerId: 'host-1', hostName: 'Host',
      hostPlays: true,
    });

    expect(body.matchConfig && 'maxOversPerBowler' in body.matchConfig).toBe(false);
  });

  it('carries the side names through', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Sunday XI', side2Name: 'The Rest', maxOvers: 6, squadSize: 3,
      hostPlayerId: 'host-1', hostName: 'Host',
      hostPlays: true,
    });

    expect(body.sides.map((s) => s.name)).toEqual(['Sunday XI', 'The Rest']);
  });

  // Career credit is written from sides[].slots[].playerId and nothing else.
  // Without this, the host who creates and scores the match earns nothing.
  it('makes side 1s first slot the host, carrying their playerId and name', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 4,
      hostPlayerId: 'host-1', hostName: 'Priya',
      hostPlays: true,
    });

    expect(body.sides[0].slots[0]).toEqual({ playerId: 'host-1', displayName: 'Priya' });
  });

  it('leaves every other slot without a playerId key at all', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 4,
      hostPlayerId: 'host-1', hostName: 'Priya',
      hostPlays: true,
    });

    const rest = [...body.sides[0].slots.slice(1), ...body.sides[1].slots];
    rest.forEach((slot) => {
      expect('playerId' in slot).toBe(false);
    });
  });

  it('still totals squadSize slots per side once the host occupies one', () => {
    const body = buildCricketCreateBody({
      side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 5,
      hostPlayerId: 'host-1', hostName: 'Priya',
      hostPlays: true,
    });

    expect(body.sides[0].slots).toHaveLength(5);
    expect(body.sides[1].slots).toHaveLength(5);
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

// A host who only keeps score must not be credited with a match they did not
// play — and a host who IS playing must be. The role is the host's choice at
// create; `hostPlays: true` is the default the screen offers.
describe('buildCricketCreateBody — host role', () => {
  const base = {
    side1Name: 'Reds', side2Name: 'Blues', maxOvers: 8, squadSize: 3,
    hostPlayerId: 'host-1', hostName: 'Priya',
  };

  it('slots the host as a player when they are playing', () => {
    const body = buildCricketCreateBody({ ...base, hostPlays: true });

    expect(body.sides[0].slots[0]).toEqual({ playerId: 'host-1', displayName: 'Priya' });
    expect(body.sides[0].slots).toHaveLength(3);
  });

  it('leaves every side-1 slot a placeholder when the host is only scoring', () => {
    const body = buildCricketCreateBody({ ...base, hostPlays: false });

    // No slot carries the host's id, so no participation row is written for
    // them and their career figures are untouched.
    expect(body.sides[0].slots.some((slot) => 'playerId' in slot)).toBe(false);
    expect(body.sides[0].slots.map((s) => s.displayName)).toEqual(['Player 1', 'Player 2', 'Player 3']);
  });

  it('keeps the squad size intact either way, so the slot the host vacates stays claimable', () => {
    const playing = buildCricketCreateBody({ ...base, hostPlays: true });
    const scoring = buildCricketCreateBody({ ...base, hostPlays: false });

    expect(playing.sides[0].slots).toHaveLength(3);
    expect(scoring.sides[0].slots).toHaveLength(3);
    expect(scoring.sides[1].slots).toHaveLength(3);
  });
});
