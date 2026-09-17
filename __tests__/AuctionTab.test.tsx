import { render, screen, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { AuctionTab } from '@/components/tournament/AuctionTab';

const envelope = (payload: unknown) => ({ data: { data: payload } });

const cat = (id: string, name: string, status = 'auction') => ({ _id: id, name, status } as never);

const auctionPayload = (status: string, extra: Record<string, unknown> = {}) =>
  envelope({
    auction: {
      _id: `a-${status}`, status, currentPlayerIndex: 3, totalPlayers: 12,
      logsCount: 0, unsoldCount: 0, rotationCount: 0,
      liveBid: { currentPrice: 0, highestBidderId: '', highestBidderName: '', bidHistory: [], tiedTeams: [], tieBreakerActive: false, spinWinnerId: null, spinStartedAt: null },
      settings: { minBidIncrement: 100, bidDurationSeconds: 30, hardLimit: 0 },
      ...extra,
    },
    currentPlayer: null, teams: [], upcoming: [],
  });

describe('AuctionTab', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('lists only the categories that actually have an auction', async () => {
    // A category with no auction document 404s. It is not an auction category
    // and must not appear, rather than showing as an empty row.
    mock.onGet('/auction/t1/c1/status').reply(200, auctionPayload('in_progress'));
    mock.onGet('/auction/t1/c2/status').reply(404);

    render(<AuctionTab tournamentId="t1" categories={[cat('c1', 'Gold Cup'), cat('c2', 'Plate', 'registration_open')]} isLoading={false} />);

    await waitFor(() => expect(screen.getByText('Gold Cup')).toBeTruthy());
    expect(screen.queryByText('Plate')).toBeNull();
  });

  it('marks a live auction and shows how far through the lots it is', async () => {
    mock.onGet('/auction/t1/c1/status').reply(200, auctionPayload('in_progress'));

    render(<AuctionTab tournamentId="t1" categories={[cat('c1', 'Gold Cup')]} isLoading={false} />);

    await waitFor(() => expect(screen.getByText('Gold Cup')).toBeTruthy());
    expect(screen.getByText(/lot 4 of 12/i)).toBeTruthy();
  });

  it('keeps a finished auction listed so the results stay reachable', async () => {
    // The whole point of splitting this out: results must not vanish the moment
    // bidding ends, which is when the Draw row stops pointing at the auction.
    mock.onGet('/auction/t1/c1/status').reply(200, auctionPayload('completed'));

    render(<AuctionTab tournamentId="t1" categories={[cat('c1', 'Gold Cup', 'ongoing')]} isLoading={false} />);

    await waitFor(() => expect(screen.getByText('Gold Cup')).toBeTruthy());
    expect(screen.getByText(/results/i)).toBeTruthy();
  });

  it('says so plainly when the tournament never ran an auction', async () => {
    mock.onGet(/\/auction\//).reply(404);

    render(<AuctionTab tournamentId="t1" categories={[cat('c1', 'Gold Cup', 'ongoing')]} isLoading={false} />);

    await waitFor(() => expect(screen.getByText(/no auction/i)).toBeTruthy());
  });
});
