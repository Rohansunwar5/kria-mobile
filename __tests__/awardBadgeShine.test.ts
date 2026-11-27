import { shineRepeats } from '@/components/AwardBadge';

test('shine: true loops forever, a number runs that many sweeps, nothing runs none', () => {
  expect(shineRepeats(true)).toBe(-1);
  expect(shineRepeats(1)).toBe(1);
  expect(shineRepeats(3)).toBe(3);
  expect(shineRepeats(false)).toBe(0);
  expect(shineRepeats(undefined)).toBe(0);
  expect(shineRepeats(0)).toBe(0);
});
