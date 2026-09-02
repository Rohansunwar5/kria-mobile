import { ballLabel, groupIntoOvers } from '../src/lib/cricketBalls';
import type { Ball } from '../src/api/cricketStats';

const ball = (over: Partial<Ball> = {}): Ball =>
  ({
    _id: Math.random().toString(),
    inningsNumber: 2,
    overNumber: 17,
    deliveryNumber: 1,
    runs: 0,
    extrasRuns: 0,
    totalRuns: 0,
    isLegalDelivery: true,
    bowlerId: 'b1',
    batsmanOnStrikeId: 'p1',
    nonStrikerId: 'p2',
    ...over,
  }) as Ball;

describe('ballLabel', () => {
  it('marks a wicket above everything else', () => {
    expect(ballLabel(ball({ wicketType: 'bowled', runs: 0 }))).toEqual({ text: 'W', kind: 'wicket' });
  });

  it('marks a boundary four and a six', () => {
    expect(ballLabel(ball({ runs: 4, totalRuns: 4 }))).toEqual({ text: '4', kind: 'four' });
    expect(ballLabel(ball({ runs: 6, totalRuns: 6 }))).toEqual({ text: '6', kind: 'six' });
  });

  it('marks a dot ball with a dot, not a zero', () => {
    expect(ballLabel(ball())).toEqual({ text: '·', kind: 'dot' });
  });

  it('marks a wide and a no-ball by their extra type', () => {
    expect(ballLabel(ball({ extrasType: 'wide', extrasRuns: 1, totalRuns: 1, isLegalDelivery: false }))).toEqual({ text: 'WD', kind: 'extra' });
    expect(ballLabel(ball({ extrasType: 'no_ball', extrasRuns: 1, totalRuns: 1, isLegalDelivery: false }))).toEqual({ text: 'NB', kind: 'extra' });
  });

  it('shows plain runs off the bat', () => {
    expect(ballLabel(ball({ runs: 2, totalRuns: 2 }))).toEqual({ text: '2', kind: 'runs' });
  });

  it('reports a wicket off a no-ball as a wicket', () => {
    // Run-outs happen on no-balls; the dismissal is the story, not the extra.
    expect(ballLabel(ball({ extrasType: 'no_ball', wicketType: 'run_out', isLegalDelivery: false })).kind).toBe('wicket');
  });
});

describe('groupIntoOvers', () => {
  const innings = [
    ball({ overNumber: 16, deliveryNumber: 1, runs: 1, totalRuns: 1 }),
    ball({ overNumber: 17, deliveryNumber: 1, runs: 4, totalRuns: 4 }),
    ball({ overNumber: 17, deliveryNumber: 2, runs: 0, totalRuns: 0, wicketType: 'caught' }),
    ball({ overNumber: 17, deliveryNumber: 3, extrasType: 'wide', extrasRuns: 1, totalRuns: 1, isLegalDelivery: false }),
  ];

  it('groups balls by over, newest over first', () => {
    const overs = groupIntoOvers(innings);
    expect(overs.map((o) => o.overNumber)).toEqual([17, 16]);
  });

  it('totals runs and wickets per over', () => {
    const [seventeen] = groupIntoOvers(innings);
    expect(seventeen.runs).toBe(5);
    expect(seventeen.wickets).toBe(1);
  });

  it('lists balls newest first within an over', () => {
    const [seventeen] = groupIntoOvers(innings);
    expect(seventeen.balls.map((b) => b.deliveryNumber)).toEqual([3, 2, 1]);
  });

  it('accumulates the running score in innings order, not display order', () => {
    const [seventeen, sixteen] = groupIntoOvers(innings);
    // 16.1 → 1/0; 17.1 → 5/0; 17.2 → 5/1; 17.3 → 6/1
    expect(sixteen.balls[0].score).toEqual({ runs: 1, wickets: 0 });
    expect(seventeen.balls.map((b) => b.score.runs)).toEqual([6, 5, 5]);
    expect(seventeen.balls[1].score.wickets).toBe(1);
  });

  it('names the bowler of the over', () => {
    const overs = groupIntoOvers([ball({ overNumber: 3, bowlerId: 'b9' })], { b9: 'M. Iqbal' });
    expect(overs[0].bowlerName).toBe('M. Iqbal');
  });

  it('returns nothing for an innings with no balls', () => {
    expect(groupIntoOvers([])).toEqual([]);
  });
});
