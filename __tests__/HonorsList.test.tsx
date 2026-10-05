import { render, screen } from '@testing-library/react-native';
import { HonorsList } from '@/components/profile/HonorsList';
import { badgeFor, CHAMPION } from '@/lib/badges';
import { dark } from '@/lib/theme/palette';

type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] } | null;
function gradientIds(node: unknown, out: string[] = []): string[] {
  const n = node as Node;
  if (!n || typeof n !== 'object') return out;
  if (n.type === 'RNSVGLinearGradient' || n.type === 'RNSVGRadialGradient') out.push(String(n.props?.name));
  (n.children ?? []).forEach((c) => gradientIds(c, out));
  return out;
}

// Badge stops its halo off-screen through expo-router's useIsFocused; a bare
// render has no navigator around it.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

describe('HonorsList', () => {
  it('lists granted honours newest first, then legacy titles', () => {
    render(
      <HonorsList
        label="Honors"
        honors={[
          { title: 'First Cap', badge: 'first-cap' },
          { title: 'Season MVP', badge: 'season-mvp' },
        ]}
        titles={['Winner of Mens Singles at Bandra Cup']}
      />,
    );

    const titles = screen
      .getAllByText(/first cap|season mvp|winner of/i)
      .map((n) => n.props.children);
    expect(titles).toEqual(['Season MVP', 'First Cap', 'Winner of Mens Singles at Bandra Cup']);
    expect(screen.getByText('Honors')).toBeTruthy();
    // Tier words, not colour alone, carry the rarity.
    expect(screen.getByText('legendary')).toBeTruthy();
    expect(screen.getByText('steel')).toBeTruthy();
    expect(screen.getByText('gold')).toBeTruthy(); // legacy title → champion art
  });

  it('sets the tier word in its tier ink, neutral for steel', () => {
    render(
      <HonorsList
        label="Honors"
        honors={[
          { title: 'Season MVP', badge: 'season-mvp' },
          { title: 'Ace Serve', badge: 'ace-serve' },
          { title: 'First Cap', badge: 'first-cap' },
        ]}
        titles={['Winner of X at Y']}
      />,
    );
    const ink = (word: string) => (screen.getByText(word).props.style as { color: string }).color;
    expect(ink('legendary')).toBe(dark.auctionInk);
    expect(ink('rare')).toBe(dark.openInk);
    expect(ink('gold')).toBe(dark.brandInk);
    expect(ink('steel')).toBe(dark.textMeta);
  });

  // On Expo web every <Svg> shares one DOM, so a gradient id reused across
  // tiers paints every badge with whichever tier's def came first.
  it('gives each tier its own gradient ids', () => {
    const legendary = gradientIds(render(<HonorsList label="H" honors={[{ title: 'A', badge: 'season-mvp' }]} />).toJSON());
    const steel = gradientIds(render(<HonorsList label="H" honors={[{ title: 'B', badge: 'first-cap' }]} />).toJSON());
    const tierOnly = (ids: string[]) => ids.filter((id) => id !== 'badge-plate');
    expect(tierOnly(legendary).length).toBeGreaterThan(0);
    expect(tierOnly(legendary).filter((id) => tierOnly(steel).includes(id))).toEqual([]);
  });

  it('renders legacy titles alone', () => {
    render(<HonorsList label="Titles" titles={['Grand Slam Champion']} />);
    expect(screen.getByText('Grand Slam Champion')).toBeTruthy();
  });

  it('renders nothing when there is nothing to show', () => {
    const { toJSON } = render(<HonorsList label="Honors" honors={[]} titles={[]} />);
    expect(toJSON()).toBeNull();
  });
});

describe('badgeFor', () => {
  it('resolves a known key', () => {
    expect(badgeFor('hat-trick')).toEqual({ tier: 'elite', emblem: 'stumps' });
  });

  // `constructor` is the trap: a plain BADGES[key] returns Object's own
  // function for it, which would render as a broken badge.
  it.each(['', undefined, 'retired-badge', 'constructor'])('falls back to champion art for %p', (key) => {
    expect(badgeFor(key)).toBe(CHAMPION);
  });
});
