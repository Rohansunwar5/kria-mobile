import type { SportSummary } from '../src/api/career';
import type { QuickMatch } from '../src/api/quickMatch';
import type { RankedPlayer } from '../src/api/rankings';
import { rankingRows } from '../src/lib/competeView';
import { matchCard, normaliseCode, sortCards } from '../src/lib/matchCard';

const p = (id: string, winRate = 0.6): RankedPlayer => ({ playerId: id, firstName: id, lastName: 'X', played: 12, decided: 12, won: 7, winRate });
const board = (n: number) => Array.from({ length: n }, (_, i) => p(`p${i}`));
const summary = (decided: number, winRate = 0.5): SportSummary => ({ sport: 'badminton', played: decided, decided, won: 0, lost: 0, tied: 0, noResult: 0, winRate });

describe('rankingRows', () => {
  it('shows six, medals for the top three, and no extra row when you are among them', () => {
    const b = board(10);
    b[2] = p('me');
    const { rows, own } = rankingRows(b, 'me', 'Aarav Menon', summary(12), false);
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.medal)).toEqual(['gold', 'silver', 'bronze', null, null, null]);
    expect(rows[2]).toMatchObject({ name: 'You', mine: true, rank: '3' });
    expect(own).toBeNull();
  });

  it('appends your row with its real rank when you sit below the visible six', () => {
    const b = board(20);
    b[11] = p('me', 0.529);
    expect(rankingRows(b, 'me', 'Aarav Menon', summary(17), false).own).toMatchObject({ rank: '12', rate: '52.9%', mine: true, medal: null });
    expect(rankingRows(b, 'me', 'Aarav Menon', summary(17), true).own).toBeNull();
  });

  it('says outside the top 50 only when the board is full', () => {
    expect(rankingRows(board(50), 'me', 'A M', summary(30), false).own).toMatchObject({ rank: '—', sub: 'Outside the top 50' });
  });

  it('turns your row into the path to 10 when you are unranked', () => {
    expect(rankingRows(board(8), 'me', 'Neha Joshi', undefined, false).own).toMatchObject({ rank: '—', sub: '0 of 10 decided matches', play: true, initials: 'NJ' });
    expect(rankingRows(board(8), 'me', 'Neha Joshi', summary(4), false).own).toMatchObject({ sub: '4 of 10 decided matches' });
  });
});

describe('matchCard', () => {
  const base = (over: Partial<QuickMatch>): QuickMatch => ({
    _id: 'm', hostId: 'h', sport: 'badminton', joinCode: 'K7QX2M', status: 'completed', createdAt: '2026-10-13T10:00:00Z',
    sides: [
      { sideId: 'a', name: 'Smash Bros', slots: [{ slotId: '1', playerId: 'me', displayName: 'Aarav Menon' }] },
      { sideId: 'b', name: 'Shuttle Club', slots: [{ slotId: '2', playerId: 'h', displayName: 'Kabir Rao' }] },
    ],
    ...over,
  });

  it('reads the result from the stored outcome for your side', () => {
    const games = [{ gameNumber: 1, side1Score: 21, side2Score: 17, winnerSideId: 'a' }, { gameNumber: 2, side1Score: 18, side2Score: 21, winnerSideId: 'b' }];
    expect(matchCard(base({ outcome: 'side1', gameScores: games }), 'me')).toMatchObject({ result: 'W', foot: '21-17, 18-21', footSub: 'Smash Bros won', line: 'Best of 3 to 21 · Hosted by Kabir Rao' });
    expect(matchCard(base({ outcome: 'side1' }), 'h').result).toBe('L');
    expect(matchCard(base({ outcome: 'tied' }), 'me').result).toBe('T');
    expect(matchCard(base({ outcome: 'side1' }), 'stranger').result).toBeNull();
  });

  it('shows cricket innings in order and dims a cancelled match', () => {
    const inns = [
      { inningsNumber: 2, battingSideId: 'b', runs: 118, wickets: 4, overs: 9, balls: 3, isAllOut: false },
      { inningsNumber: 1, battingSideId: 'a', runs: 112, wickets: 6, overs: 10, balls: 0, isAllOut: false },
    ];
    expect(matchCard(base({ sport: 'cricket', inningsScores: inns, outcome: 'side2' }), 'me')).toMatchObject({ foot: '112/6 vs 118/4', result: 'L' });
    expect(matchCard(base({ status: 'cancelled' }), 'me')).toMatchObject({ foot: 'Cancelled by host', dim: true, right: { kind: 'text', text: 'Tue 13 Oct' } });
  });

  it('sorts live, then waiting, then finished, newest first', () => {
    const c = (id: string, status: QuickMatch['status'], createdAt: string) => ({ ...matchCard(base({ _id: id, status }), 'me'), createdAt });
    expect(sortCards([c('a', 'completed', '2026-10-14'), c('b', 'waiting', '2026-10-01'), c('c', 'live', '2026-09-01'), c('d', 'completed', '2026-10-15')]).map((x) => x.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

it('keeps only the server code alphabet', () => {
  expect(normaliseCode('k7-qx 2m0O1I9')).toBe('K7QX2M');
});
