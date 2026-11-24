export type Root = string; // segments[0] as a string, 'undefined' when none

/**
 * The AuthGate's decision. null = stay where you are. A signed-in player with no
 * date of birth can't go further until they give one (LAUNCH-AUDIT H26), however
 * they got here: onboarding interrupted, or a Google sign-up.
 */
export function routeFor(s: { signedIn: boolean; pendingOnboarding: boolean; needsDob?: boolean; root: Root; publicRoots: string[] }):
  '/(auth)/welcome' | '/(onboarding)/your-game' | '/(onboarding)/for-tournaments' | '/(tabs)/home' | null {
  if (!s.signedIn) return s.root !== 'undefined' && s.publicRoots.includes(s.root) ? null : '/(auth)/welcome';
  if (s.pendingOnboarding) return s.root === '(onboarding)' ? null : '/(onboarding)/your-game';
  if (s.needsDob) return s.root === '(onboarding)' ? null : '/(onboarding)/for-tournaments';
  return s.root === '(auth)' || s.root === 'undefined' ? '/(tabs)/home' : null;
}
