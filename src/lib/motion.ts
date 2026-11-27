import { FadeIn, FadeInUp } from 'react-native-reanimated';
import { ease } from '@/constants/theme';

/** First-load list stagger: 40ms apart, and row 7 onwards arrives with row 6. */
export const staggerDelay = (i: number) => Math.min(i, 5) * 40;

/**
 * DESIGN v1.2 §9 list stagger, for a list's first load after its skeleton
 * only — never refresh, filter change or "Load more". Rows rise 8px; reduced
 * motion gets a plain 160ms fade, all at once.
 */
export function enterStagger(i: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(160);
  return FadeInUp.duration(220)
    .delay(staggerDelay(i))
    .easing(ease.enter)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
}
