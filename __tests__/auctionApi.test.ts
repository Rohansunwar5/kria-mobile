import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getAuctionStatus, getAuctionSoldLog } from '@/api/auction';

describe('auction api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('getAuctionStatus unwraps nested data', async () => {
    mock.onGet('/auction/t1/c1/status').reply(200, {
      data: { data: { auction: { _id: 'a1', status: 'in_progress' }, currentPlayer: null, teams: [] } },
    });
    const result = await getAuctionStatus('t1', 'c1');
    expect(result.auction._id).toBe('a1');
    expect(result.teams).toEqual([]);
  });

  it('getAuctionSoldLog unwraps nested data', async () => {
    mock.onGet('/auction/t1/c1/sold-log').reply(200, {
      data: { data: { logs: [{ _id: 'l1', finalPrice: 500 }], totalSold: 1, totalRevenue: 500 } },
    });
    const result = await getAuctionSoldLog('t1', 'c1');
    expect(result.logs).toHaveLength(1);
    expect(result.totalRevenue).toBe(500);
  });

  it('getAuctionSoldLog returns empty shape when payload missing', async () => {
    mock.onGet('/auction/t1/c1/sold-log').reply(200, {});
    const result = await getAuctionSoldLog('t1', 'c1');
    expect(result.logs).toEqual([]);
    expect(result.totalSold).toBe(0);
  });
});
