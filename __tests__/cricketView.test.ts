import {
  oversDisplay, currentRunRate, requiredRunRate, chaseLine,
  dismissalLine, ballChipKind, recentBalls, tallyKey,
} from '@/lib/cricketView';

describe('cricketView helpers', () => {
  it('oversDisplay formats completed.balls', () => {
    expect(oversDisplay({ completedOvers: 16, ballsInCurrentOver: 2 } as any)).toBe('16.2');
    expect(oversDisplay(null as any)).toBe('0.0');
  });

  it('currentRunRate = runs * 6 / balls bowled', () => {
    expect(currentRunRate({ runs: 100, completedOvers: 15, ballsInCurrentOver: 0 } as any)).toBe(6.67);
    expect(currentRunRate({ runs: 0, completedOvers: 0, ballsInCurrentOver: 0 } as any)).toBe(0);
  });

  it('requiredRunRate uses remaining balls, null when not chasing', () => {
    expect(requiredRunRate({ runs: 120, target: 180, completedOvers: 10, ballsInCurrentOver: 0 } as any, 20)).toBe(6);
    expect(requiredRunRate({ runs: 50, completedOvers: 5, ballsInCurrentOver: 0 } as any, 20)).toBeNull();
  });

  it('requiredRunRate returns null when no balls remain', () => {
    expect(requiredRunRate({ runs: 100, target: 180, completedOvers: 20, ballsInCurrentOver: 0 } as any, 20)).toBeNull();
  });

  it('chaseLine describes the chase / achieved / null', () => {
    expect(chaseLine({ runs: 142, target: 180, completedOvers: 16, ballsInCurrentOver: 2 } as any, 20))
      .toBe('Need 38 in 22 balls');
    expect(chaseLine({ runs: 180, target: 180, completedOvers: 18, ballsInCurrentOver: 0 } as any, 20))
      .toBe('Target achieved');
    expect(chaseLine({ runs: 50, completedOvers: 5, ballsInCurrentOver: 0 } as any, 20)).toBeNull();
  });

  it('dismissalLine renders each dismissal type', () => {
    expect(dismissalLine(undefined)).toBe('not out');
    expect(dismissalLine({ type: 'bowled', bowlerName: 'Bumrah' })).toBe('b Bumrah');
    expect(dismissalLine({ type: 'lbw', bowlerName: 'Shami' })).toBe('lbw b Shami');
    expect(dismissalLine({ type: 'caught', bowlerName: 'Bumrah', fielderName: 'Rohit' })).toBe('c Rohit b Bumrah');
    expect(dismissalLine({ type: 'run_out', fielderName: 'Jadeja' })).toBe('run out (Jadeja)');
    expect(dismissalLine({ type: 'retired_hurt' })).toBe('retired hurt');
  });

  it('ballChipKind classifies labels', () => {
    expect(ballChipKind({ label: '6', runs: 6, isWicket: false })).toBe('six');
    expect(ballChipKind({ label: '4', runs: 4, isWicket: false })).toBe('four');
    expect(ballChipKind({ label: 'W', runs: 0, isWicket: true })).toBe('wicket');
    expect(ballChipKind({ label: 'wd', runs: 1, isWicket: false })).toBe('extra');
    expect(ballChipKind({ label: '0', runs: 0, isWicket: false })).toBe('dot');
    expect(ballChipKind({ label: '2', runs: 2, isWicket: false })).toBe('run');
  });

  it('recentBalls flattens the last N overs', () => {
    const innings: any = {
      oversTimeline: [
        { overNumber: 1, runs: 4, wickets: 0, balls: [{ label: '4', runs: 4, isWicket: false }] },
        { overNumber: 2, runs: 0, wickets: 1, balls: [{ label: 'W', runs: 0, isWicket: true }, { label: '0', runs: 0, isWicket: false }] },
      ],
    };
    const out = recentBalls(innings, 1);
    expect(out).toEqual([
      { label: 'W', kind: 'wicket' },
      { label: '0', kind: 'dot' },
    ]);
  });

  it('recentBalls is empty when no timeline', () => {
    expect(recentBalls(null, 2)).toEqual([]);
    expect(recentBalls({ oversTimeline: [] } as any, 2)).toEqual([]);
  });

  it('tallyKey changes when the tally changes', () => {
    const a = tallyKey({ runs: 10, wickets: 0, completedOvers: 2, ballsInCurrentOver: 3, matchStatus: 'in_progress' } as any);
    const b = tallyKey({ runs: 14, wickets: 0, completedOvers: 2, ballsInCurrentOver: 4, matchStatus: 'in_progress' } as any);
    expect(a).not.toBe(b);
    expect(tallyKey(null as any)).toBe('0|0|0|0|');
  });
});
