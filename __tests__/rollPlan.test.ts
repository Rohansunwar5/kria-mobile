import { rollPlan } from '@/lib/rollPlan';

test('increase rolls up, wrapping past 9', () => {
  expect(rollPlan('58.3%', '61.5%')).toEqual([
    { char: '6', roll: { start: 5, end: 6 } },
    { char: '1', roll: { start: 8, end: 11 } },
    { char: '.' },
    { char: '5', roll: { start: 3, end: 5 } },
    { char: '%' },
  ]);
  expect(rollPlan('49', '50')).toEqual([
    { char: '5', roll: { start: 4, end: 5 } },
    { char: '0', roll: { start: 9, end: 10 } },
  ]);
});

test('decrease rolls down', () => {
  expect(rollPlan('58.3%', '53.8%')).toEqual([
    { char: '5' },
    { char: '3', roll: { start: 18, end: 13 } },
    { char: '.' },
    { char: '8', roll: { start: 13, end: 8 } },
    { char: '%' },
  ]);
});

test('equal digits are static', () => {
  expect(rollPlan('12', '12')).toEqual([{ char: '1' }, { char: '2' }]);
});

test('different lengths or a non-number "from" render statically', () => {
  expect(rollPlan('9', '10')).toBeNull();
  expect(rollPlan('—', '61.5%')).toBeNull();
});
