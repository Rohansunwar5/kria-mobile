import type { QuickMatch } from '@/api/quickMatch';

export type Portal = 'events' | 'play';

/** Whether any of your quick matches is in progress. This is what puts the dot
 *  on the PLAY tab — the only unprompted reason to cross portals. */
export function hasLiveQuickMatch(matches: QuickMatch[]): boolean {
  return matches.some((m) => m.status === 'live');
}

/**
 * The one-line strip under the switch. It says what is behind the side you are
 * on, so the portal you are not looking at is never a mystery.
 */
export function portalStrip(
  portal: Portal,
  opts: { openCount: number; city: string; played: number; live: boolean },
): string {
  if (portal === 'play') {
    if (opts.live) return 'YOUR GAME · 1 LIVE NOW';
    if (opts.played === 0) return 'YOUR GAME · NOTHING PLAYED YET';
    return `YOUR GAME · ${opts.played} PLAYED`;
  }
  const where = opts.city === 'All' ? '' : ` IN ${opts.city.toUpperCase()}`;
  return `ORGANISER-HOSTED · ${opts.openCount} OPEN${where}`;
}
