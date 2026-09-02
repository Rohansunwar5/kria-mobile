import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getCategoryLeaderboard } from '@/api/leaderboard';

describe('getCategoryLeaderboard', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(API);
  });
  afterEach(() => {
    mock.restore();
  });

  const row = (over: any = {}) => ({
    _id: 'p1',
    playerName: 'A. Kohli',
    teamName: 'Thunder Blazers',
    matchesPlayed: 8,
    matchesWon: 8,
    totalPointsScored: 24,
    rank: 1,
    ...over,
  });

  it('normalises a flat category into a single unnamed board', async () => {
    mock.onGet('/matches/leaderboard/c1').reply(200, {
      data: { data: { leaderboard: [row()], sportType: 'badminton', categoryName: "Men's Singles" } },
    });
    const res = await getCategoryLeaderboard('c1');
    expect(res.categoryName).toBe("Men's Singles");
    expect(res.boards).toHaveLength(1);
    expect(res.boards[0].label).toBeNull();
    expect(res.boards[0].entries[0].playerName).toBe('A. Kohli');
  });

  it('normalises a team-league category into one board per sub-match slot', async () => {
    mock.onGet('/matches/leaderboard/c2').reply(200, {
      data: {
        data: {
          slots: [
            { slotNumber: 1, label: 'Singles', leaderboard: [row()] },
            { slotNumber: 2, label: 'Doubles', leaderboard: [row({ _id: 'p2' })] },
          ],
          categoryName: "Women's Doubles",
        },
      },
    });
    const res = await getCategoryLeaderboard('c2');
    expect(res.boards.map((b) => b.label)).toEqual(['Singles', 'Doubles']);
  });

  it('falls back to a slot number when a slot has no label', async () => {
    mock.onGet('/matches/leaderboard/c3').reply(200, {
      data: { data: { slots: [{ slotNumber: 3, leaderboard: [] }] } },
    });
    const res = await getCategoryLeaderboard('c3');
    expect(res.boards[0].label).toBe('Slot 3');
  });

  it('returns an empty board rather than throwing on an empty payload', async () => {
    mock.onGet('/matches/leaderboard/c4').reply(200, {});
    const res = await getCategoryLeaderboard('c4');
    expect(res.boards).toEqual([{ label: null, entries: [] }]);
  });
});
