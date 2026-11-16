import { rupees } from '@/lib/format';

describe('rupees', () => {
  it('drops decimals on whole amounts, else two places, Indian grouping', () => {
    expect(rupees(628.32)).toBe('₹628.32');
    expect(rupees(600)).toBe('₹600');
    expect(rupees(14000)).toBe('₹14,000');
    expect(rupees(4.3)).toBe('₹4.30');
  });
});
