import { spinTargetAngle, spinPhase, pointerLandsOn, SPIN_DURATION_MS } from '@/lib/auctionSpin';

describe('spinTargetAngle', () => {
  it('lands the pointer on the winning segment for every team count', () => {
    // The property that matters: whatever the maths, the segment under the
    // top pointer when the wheel stops must be the winner's.
    for (const count of [2, 3, 4, 5, 6, 8]) {
      for (let winner = 0; winner < count; winner++) {
        const angle = spinTargetAngle(winner, count, 5);
        expect(pointerLandsOn(angle, count)).toBe(winner);
      }
    }
  });

  it('includes the requested whole rotations so the spin reads as a spin', () => {
    const five = spinTargetAngle(0, 4, 5);
    const eight = spinTargetAngle(0, 4, 8);
    expect(five).toBeGreaterThanOrEqual(5 * 360);
    expect(eight - five).toBe(3 * 360);
  });

  it('is 0 when there is nothing to spin', () => {
    expect(spinTargetAngle(0, 1, 5)).toBe(0);
    expect(spinTargetAngle(-1, 4, 5)).toBe(0);
    expect(spinTargetAngle(0, 0, 5)).toBe(0);
  });
});

describe('spinPhase', () => {
  const t0 = 1_700_000_000_000;

  it('is idle until the organizer triggers the spin', () => {
    expect(spinPhase(null, null, t0)).toBe('idle');
    expect(spinPhase(new Date(t0).toISOString(), null, t0)).toBe('idle');
  });

  it('animates when we joined while the wheel is still turning', () => {
    const startedAt = new Date(t0).toISOString();
    expect(spinPhase(startedAt, 'team-a', t0 + 500)).toBe('spinning');
    expect(spinPhase(startedAt, 'team-a', t0 + SPIN_DURATION_MS - 1)).toBe('spinning');
  });

  it('shows the result outright when we joined after the wheel stopped', () => {
    const startedAt = new Date(t0).toISOString();
    expect(spinPhase(startedAt, 'team-a', t0 + SPIN_DURATION_MS + 1)).toBe('done');
    expect(spinPhase(startedAt, 'team-a', t0 + 60_000)).toBe('done');
  });

  it('shows the result when a winner exists but the timestamp does not', () => {
    expect(spinPhase(null, 'team-a', t0)).toBe('done');
  });

  it('does not animate on a timestamp the server sent from the future', () => {
    const startedAt = new Date(t0 + 30_000).toISOString();
    expect(spinPhase(startedAt, 'team-a', t0)).toBe('spinning');
  });
});
