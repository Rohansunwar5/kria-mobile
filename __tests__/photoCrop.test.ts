import { clampView, coverScale, cropRect, normalizeActions, zoomAbout } from '../src/lib/photoCrop';

const img = { width: 900, height: 1200 };

it('cover scale fills the circle on the short side', () => {
  expect(coverScale(img, 300)).toBeCloseTo(1 / 3);
  expect(coverScale({ width: 4000, height: 800 }, 300)).toBeCloseTo(300 / 800);
});

it('clamps zoom to [cover, 4x cover] and pan so no gap shows', () => {
  expect(clampView({ s: 0.1, x: 0, y: 0 }, img, 300).s).toBeCloseTo(1 / 3);
  expect(clampView({ s: 10, x: 0, y: 0 }, img, 300).s).toBeCloseTo(4 / 3);
  expect(clampView({ s: 1 / 3, x: 40, y: 80 }, img, 300)).toEqual({ s: 1 / 3, x: 0, y: 50 });
});

it('zooms about the focal point', () => {
  expect(zoomAbout({ s: 1, x: 10, y: -4 }, 0, 0, 2)).toEqual({ s: 2, x: 20, y: -8 });
  expect(zoomAbout({ s: 1, x: 0, y: 0 }, 50, 0, 2)).toEqual({ s: 2, x: -50, y: 0 });
});

it('maps the circle to image pixels', () => {
  expect(cropRect({ s: 1 / 3, x: 0, y: 0 }, img, 300)).toEqual({ originX: 0, originY: 150, width: 900, height: 900 });
  expect(cropRect({ s: 1 / 3, x: 0, y: 50 }, img, 300)).toEqual({ originX: 0, originY: 0, width: 900, height: 900 });
  expect(cropRect({ s: 2 / 3, x: 0, y: 0 }, img, 300)).toEqual({ originX: 225, originY: 375, width: 450, height: 450 });
});

it('keeps the rect inside the image after rounding', () => {
  const r = cropRect({ s: 0.3333, x: 0.4, y: 0 }, { width: 901, height: 1201 }, 300);
  expect(r.originX).toBeGreaterThanOrEqual(0);
  expect(r.originX + r.width).toBeLessThanOrEqual(901);
  expect(r.originY + r.height).toBeLessThanOrEqual(1201);
});

it('handles a photo smaller than the circle', () => {
  const small = { width: 200, height: 300 };
  expect(cropRect({ s: coverScale(small, 300), x: 0, y: 0 }, small, 300)).toEqual({ originX: 0, originY: 50, width: 200, height: 200 });
});

it('only downsizes photos over 2048 on the long side', () => {
  expect(normalizeActions({ width: 1000, height: 2000 })).toEqual([]);
  expect(normalizeActions({ width: 4032, height: 3024 })).toEqual([{ resize: { width: 2048 } }]);
  expect(normalizeActions({ width: 3024, height: 4032 })).toEqual([{ resize: { height: 2048 } }]);
});
