import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getCategory, getSportConfig, slotPressure } from '@/api/category';

describe('category api', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(API);
  });
  afterEach(() => {
    mock.restore();
  });

  it('getCategory unwraps the response envelope', async () => {
    mock.onGet('/categories/c1').reply(200, { data: { data: { _id: 'c1', name: "Men's Singles" } } });
    const cat = await getCategory('c1');
    expect(cat?.name).toBe("Men's Singles");
  });

  it('getCategory returns null rather than throwing when the payload is empty', async () => {
    mock.onGet('/categories/c2').reply(200, {});
    expect(await getCategory('c2')).toBeNull();
  });

  it('getSportConfig unwraps scoring rules for the format block', async () => {
    mock.onGet('/sports/badminton').reply(200, {
      data: { data: { sport: 'badminton', scoringConfig: { pointsToWin: 21, maxPoints: 30 }, defaults: { bestOf: 3 } } },
    });
    const cfg = await getSportConfig('badminton');
    expect(cfg?.scoringConfig?.pointsToWin).toBe(21);
    expect(cfg?.defaults?.bestOf).toBe(3);
  });

  it('getSportConfig returns null for a sport with no config', async () => {
    mock.onGet('/sports/kabaddi').reply(404);
    expect(await getSportConfig('kabaddi')).toBeNull();
  });
});

describe('slotPressure', () => {
  it('reports remaining slots and fill ratio', () => {
    const p = slotPressure(28, 32);
    expect(p.left).toBe(4);
    expect(p.ratio).toBeCloseTo(0.875);
    expect(p.filling).toBe(true);
  });

  it('is not "filling fast" when plenty of room remains', () => {
    expect(slotPressure(4, 32).filling).toBe(false);
  });

  it('treats a category with no cap as unlimited', () => {
    const p = slotPressure(28, 0);
    expect(p.unlimited).toBe(true);
    expect(p.ratio).toBe(0);
    expect(p.filling).toBe(false);
  });

  it('never reports negative slots when a category is over-subscribed', () => {
    const p = slotPressure(35, 32);
    expect(p.left).toBe(0);
    expect(p.ratio).toBe(1);
  });
});
