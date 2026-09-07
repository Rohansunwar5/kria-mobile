/**
 * Back, but safe when there is nothing behind this screen.
 *
 * A screen reached directly — a deep link, a notification tap, or a web refresh
 * on a detail URL — has an empty history, and a bare `router.back()` there does
 * nothing except log "The action 'GO_BACK' was not handled by any navigator",
 * leaving the user stuck.
 *
 * ponytail: one global fallback rather than a sensible parent per screen. Pass
 * `fallback` where home is the wrong place to land.
 */
// Structural, so it accepts both `useRouter()` and the imported `router`.
type Backable = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: never) => void;
};

export function goBack(router: Backable, fallback = '/(tabs)/home') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
