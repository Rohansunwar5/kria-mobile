import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import {
  createQuickMatch,
  listMyQuickMatches,
  recordQuickBall,
  recordQuickLineup,
  recordQuickToss,
  undoQuickBall,
} from '@/api/quickMatch';

const mock = new MockAdapter(API);

/** The server nests SuccessResponse payloads two levels below the body. */
const envelope = (payload: unknown) => ({ data: { data: payload } });

const cricketMatch = (over: Record<string, unknown> = {}) => ({
  _id: 'm1',
  hostId: 'h1',
  sport: 'cricket',
  joinCode: 'ABC123',
  status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', displayName: 'A1' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'B1' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
  inningsScores: [],
  ...over,
});

afterEach(() => mock.reset());

describe('quick cricket api', () => {
  // The one line that gated this whole feature out of the app.
  it('listMyQuickMatches returns cricket matches, not only badminton', async () => {
    mock.onGet('/quick-match/mine').reply(200, envelope([
      cricketMatch(),
      { ...cricketMatch(), _id: 'm2', sport: 'badminton' },
    ]));

    const list = await listMyQuickMatches();

    expect(list.map((m) => m.sport)).toEqual(['cricket', 'badminton']);
  });

  it('createQuickMatch sends a cricket matchConfig', async () => {
    mock.onPost('/quick-match').reply(200, envelope(cricketMatch()));

    await createQuickMatch({
      sport: 'cricket',
      sides: [
        { name: 'Reds', slots: [{ displayName: 'A1' }] },
        { name: 'Blues', slots: [{ displayName: 'B1' }] },
      ],
      matchConfig: { maxOvers: 8, playersPerTeam: 6 },
    });

    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      sport: 'cricket',
      matchConfig: { maxOvers: 8, playersPerTeam: 6 },
    });
  });

  it('recordQuickToss posts the winning side and decision', async () => {
    const decided = cricketMatch({
      cricketSetup: { toss: { winnerTeamId: 's1', decision: 'bat', recorded: true }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
    });
    mock.onPost('/quick-match/m1/cricket/toss').reply(200, envelope(decided));

    const out = await recordQuickToss('m1', { winnerSideId: 's1', decision: 'bat' });

    expect(JSON.parse(mock.history.post[0].data)).toEqual({ winnerSideId: 's1', decision: 'bat' });
    expect(out.cricketSetup?.toss.recorded).toBe(true);
  });

  it('recordQuickLineup posts one side at a time, carrying playerId through', async () => {
    mock.onPost('/quick-match/m1/cricket/lineup').reply(200, envelope(cricketMatch()));

    await recordQuickLineup('m1', {
      sideId: 's1',
      players: [{ slotId: 'a1', playerId: 'p1', name: 'A1' }],
    });

    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      sideId: 's1',
      players: [{ slotId: 'a1', playerId: 'p1', name: 'A1' }],
    });
  });

  it('recordQuickBall posts the full delivery, omitting absent optionals', async () => {
    mock.onPost('/quick-match/m1/cricket/ball').reply(200, envelope(cricketMatch()));

    await recordQuickBall('m1', {
      batsmanOnStrikeId: 'a1',
      nonStrikerId: 'a2',
      bowlerId: 'b1',
      runs: 4,
    });

    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 4 });
    expect('wicketType' in body).toBe(false);
  });

  it('recordQuickBall carries extras and a wicket when present', async () => {
    mock.onPost('/quick-match/m1/cricket/ball').reply(200, envelope(cricketMatch()));

    await recordQuickBall('m1', {
      batsmanOnStrikeId: 'a1',
      nonStrikerId: 'a2',
      bowlerId: 'b1',
      runs: 0,
      extrasType: 'wide',
      extrasRuns: 1,
      wicketType: 'caught',
      dismissedPlayerId: 'a1',
      fielderId: 'b2',
    });

    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      extrasType: 'wide',
      extrasRuns: 1,
      wicketType: 'caught',
      dismissedPlayerId: 'a1',
      fielderId: 'b2',
    });
  });

  it('undoQuickBall posts to the cricket undo route', async () => {
    mock.onPost('/quick-match/m1/cricket/undo').reply(200, envelope(cricketMatch()));

    await undoQuickBall('m1');

    expect(mock.history.post[0].url).toBe('/quick-match/m1/cricket/undo');
  });
});
