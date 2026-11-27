import { staggerDelay } from '@/lib/motion';
import { colors, spring } from '@/constants/theme';

test('stagger is 40ms apart and stops at the sixth row', () => {
  expect([0, 1, 3, 5, 6, 40].map(staggerDelay)).toEqual([0, 40, 120, 200, 200, 200]);
});

test('spring tokens and lip colour match the spec', () => {
  expect(spring).toEqual({
    snappy: { damping: 32, stiffness: 400, mass: 1 },
    bouncy: { damping: 17, stiffness: 220, mass: 1 },
    gentle: { damping: 26, stiffness: 170, mass: 1 },
    fill: { damping: 19, stiffness: 180, mass: 1 },
  });
  expect(colors.accentLip).toBe('#B8411A');
});
