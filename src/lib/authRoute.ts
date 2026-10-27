export type Root = string; // segments[0] as a string, 'undefined' when none

/** The AuthGate's decision. null = stay where you are. */
export function routeFor(s: { signedIn: boolean; pendingOnboarding: boolean; root: Root; publicRoots: string[] }):
  '/(auth)/welcome' | '/(onboarding)/your-game' | '/(tabs)/home' | null {
  if (!s.signedIn) return s.root !== 'undefined' && s.publicRoots.includes(s.root) ? null : '/(auth)/welcome';
  if (s.pendingOnboarding) return s.root === '(onboarding)' ? null : '/(onboarding)/your-game';
  return s.root === '(auth)' || s.root === 'undefined' ? '/(tabs)/home' : null;
}
