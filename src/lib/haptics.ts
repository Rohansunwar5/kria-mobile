import * as Haptics from 'expo-haptics';

/**
 * The haptic map (DESIGN v1.2 §9, GAMIFICATION-MOTION §4.3): components name
 * the event, this file picks the feel. Fire-and-forget; a phone without a
 * motor (or a failed call) is never an error.
 *
 * Rules: at most one notificationAsync per screen visit; never in a loop.
 * Haptics still fire under reduced motion — they aren't motion.
 */
const quiet = (p: Promise<void>) => {
  p.catch(() => {});
};

export const haptics = {
  /** A swipe point accepted. */
  point: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A game closes in the match room. */
  gameEnd: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Primary button press-in. */
  press: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Tab, segment, toggle; your rank row arriving. */
  select: () => quiet(Haptics.selectionAsync()),
  /** You won the match. */
  win: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** You lost the match. */
  loss: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** An award minted in a reveal. */
  award: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** An inline mint after a win already used the visit's one Success. */
  mint: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A progress bar reaching 100%. */
  tick: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
