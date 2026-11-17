/**
 * Crop-screen math. A view is the photo's place under the circle: `s` maps image
 * pixels to screen points, `x`/`y` offset the image centre from the circle centre.
 * Worklets, so the gesture callbacks can run them on the UI thread.
 */
export type Size = { width: number; height: number };
export type View = { s: number; x: number; y: number };

const MAX_ZOOM = 4;
const MAX_SIDE = 2048;

/** Smallest scale at which the photo still covers a circle of diameter `d`. */
export function coverScale(img: Size, d: number): number {
  'worklet';
  return Math.max(d / img.width, d / img.height);
}

/** Zoom held to [cover, 4 × cover] and pan held so no gap shows in the circle. */
export function clampView(v: View, img: Size, d: number): View {
  'worklet';
  const min = coverScale(img, d);
  const s = Math.min(min * MAX_ZOOM, Math.max(min, v.s));
  const lx = Math.max(0, (img.width * s - d) / 2);
  const ly = Math.max(0, (img.height * s - d) / 2);
  return { s, x: Math.min(lx, Math.max(-lx, v.x)), y: Math.min(ly, Math.max(-ly, v.y)) };
}

/** Scale by `ratio` about a focal point given relative to the circle centre. */
export function zoomAbout(v: View, fx: number, fy: number, ratio: number): View {
  'worklet';
  return { s: v.s * ratio, x: fx + (v.x - fx) * ratio, y: fy + (v.y - fy) * ratio };
}

/** The circle's square in image pixels: whole numbers, always inside the image. */
export function cropRect(v: View, img: Size, d: number) {
  'worklet';
  const size = Math.round(Math.min(d / v.s, img.width, img.height));
  const cx = img.width / 2 - v.x / v.s;
  const cy = img.height / 2 - v.y / v.s;
  const originX = Math.min(img.width - size, Math.max(0, Math.round(cx - size / 2)));
  const originY = Math.min(img.height - size, Math.max(0, Math.round(cy - size / 2)));
  return { originX, originY, width: size, height: size };
}

/** Manipulator actions that bring the long side down to 2048 (none if it's already there). */
export function normalizeActions(img: Size): { resize: { width: number } | { height: number } }[] {
  if (Math.max(img.width, img.height) <= MAX_SIDE) return [];
  return [{ resize: img.width >= img.height ? { width: MAX_SIDE } : { height: MAX_SIDE } }];
}
