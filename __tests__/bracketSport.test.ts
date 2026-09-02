import { categorySport, scoreboardLink } from '../src/lib/bracketView';
import type { Match } from '../src/api/match';

const m = (over: Partial<Match> = {}): Match => ({ _id: 'm', status: 'scheduled', ...over }) as Match;

describe('categorySport', () => {
  it('reads cricket from the overs-based match config', () => {
    expect(categorySport([m(), m({ matchConfig: { maxOvers: 20 } as any })])).toBe('cricket');
  });

  it('reads badminton from a points-based match config', () => {
    expect(categorySport([m({ matchConfig: { bestOf: 3, pointsToWin: 21 } as any })])).toBe('badminton');
  });

  it('reads badminton from recorded game scores when no config is set', () => {
    expect(categorySport([m({ gameScores: [{ gameNumber: 1, team1Score: 21, team2Score: 18 }] as any })])).toBe('badminton');
  });

  it('prefers cricket when a category somehow carries both markers', () => {
    expect(categorySport([m({ matchConfig: { maxOvers: 20, bestOf: 3 } as any })])).toBe('cricket');
  });

  it('is undefined when nothing identifies the sport', () => {
    expect(categorySport([m(), m()])).toBeUndefined();
    expect(categorySport([])).toBeUndefined();
  });
});

describe('scoreboardLink', () => {
  it('links a live badminton match — the whole point of fixing the live route', () => {
    expect(scoreboardLink(m({ status: 'in_progress' }), 'badminton')).toBe('live');
  });

  it('links a live cricket match', () => {
    expect(scoreboardLink(m({ status: 'in_progress' }), 'cricket')).toBe('live');
  });

  it('links a finished match to its result sheet', () => {
    expect(scoreboardLink(m({ status: 'completed' }), 'badminton')).toBe('result');
    expect(scoreboardLink(m({ status: 'walkover' }), 'cricket')).toBe('result');
  });

  it('does not link a match that has not started', () => {
    expect(scoreboardLink(m({ status: 'scheduled' }), 'badminton')).toBeNull();
  });

  it('does not link a sport with no scoreboard', () => {
    expect(scoreboardLink(m({ status: 'in_progress' }), undefined)).toBeNull();
    expect(scoreboardLink(m({ status: 'in_progress' }), 'football')).toBeNull();
  });
});
