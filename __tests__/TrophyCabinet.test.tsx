import { render, screen } from '@testing-library/react-native';
import { TrophyCabinet } from '../src/components/profile/TrophyCabinet';
import { badgeFor, CHAMPION } from '../src/lib/badges';
import { dark } from '../src/lib/theme/palette';
import type { Achievement } from '../src/api/career';

// Badge stops its halo off-screen through expo-router's useIsFocused; a bare
// render has no navigator around it.
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] } | null;
function gradientIds(node: unknown, out: string[] = []): string[] {
  const n = node as Node;
  if (!n || typeof n !== 'object') return out;
  if (n.type === 'RNSVGLinearGradient' || n.type === 'RNSVGRadialGradient') out.push(String(n.props?.name));
  (n.children ?? []).forEach((c) => gradientIds(c, out));
  return out;
}

const achievement = (over: Partial<Achievement> = {}): Achievement => ({
  id: 'matches-50',
  label: 'Play 50 matches',
  earned: false,
  progress: 0,
  target: 50,
  ...over,
});

describe('TrophyCabinet — honours', () => {
  it('shelves granted honours newest first, then legacy titles', () => {
    render(
      <TrophyCabinet
        honors={[
          { title: 'First Cap', badge: 'first-cap' },
          { title: 'Season MVP', badge: 'season-mvp' },
        ]}
        titles={['Winner of Mens Singles at Bandra Cup']}
        achievements={[]}
      />,
    );
    const titles = screen.getAllByText(/first cap|season mvp|winner of/i).map((n) => n.props.children);
    expect(titles).toEqual(['Season MVP', 'First Cap', 'Winner of Mens Singles at Bandra Cup']);
    // Tier words, not colour alone, carry the rarity.
    expect(screen.getByText('legendary')).toBeTruthy();
    expect(screen.getByText('steel')).toBeTruthy();
    expect(screen.getByText('gold')).toBeTruthy(); // legacy title → champion art
  });

  it('sets the tier word in its tier ink, neutral for steel', () => {
    render(
      <TrophyCabinet
        honors={[
          { title: 'Season MVP', badge: 'season-mvp' },
          { title: 'Ace Serve', badge: 'ace-serve' },
          { title: 'First Cap', badge: 'first-cap' },
        ]}
        titles={['Winner of X at Y']}
        achievements={[]}
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
    const legendary = gradientIds(render(<TrophyCabinet honors={[{ title: 'A', badge: 'season-mvp' }]} achievements={[]} />).toJSON());
    const steel = gradientIds(render(<TrophyCabinet honors={[{ title: 'B', badge: 'first-cap' }]} achievements={[]} />).toJSON());
    const tierOnly = (ids: string[]) => ids.filter((id) => id !== 'badge-plate' && id !== 'badge-shine');
    expect(tierOnly(legendary).length).toBeGreaterThan(0);
    expect(tierOnly(legendary).filter((id) => tierOnly(steel).includes(id))).toEqual([]);
  });
});

describe('TrophyCabinet — milestones', () => {
  // DESIGN.md §7: colour is never the only signal.
  it('announces earned vs locked beyond colour alone', () => {
    const { getByLabelText } = render(
      <TrophyCabinet
        achievements={[
          achievement({ id: 'wins-25', label: 'Win 25 matches', earned: true, progress: 25, target: 25 }),
          achievement({ id: 'matches-100', label: 'Play 100 matches', earned: false, progress: 57, target: 100 }),
        ]}
      />,
    );
    expect(getByLabelText(/win 25 matches.*earned/i)).toBeTruthy();
    expect(getByLabelText(/play 100 matches.*locked/i)).toBeTruthy();
  });

  // wins-25 sits at 5/25 (20%); matches-100 at 57/100 (57%) — closer to
  // unlocking though it comes later in the array and has a bigger target.
  it('lists the next milestones closest to unlocking first', () => {
    const { getAllByLabelText, getByText } = render(
      <TrophyCabinet
        achievements={[
          achievement({ id: 'wins-25', label: 'Win 25 matches', progress: 5, target: 25 }),
          achievement({ id: 'matches-100', label: 'Play 100 matches', progress: 57, target: 100 }),
        ]}
      />,
    );
    const order = getAllByLabelText(/— locked$/).map((n) => n.props.accessibilityLabel);
    expect(order).toEqual(['Play 100 matches, 57 of 100 — locked', 'Win 25 matches, 5 of 25 — locked']);
    expect(getByText('57/100')).toBeTruthy();
  });

  it('drops the next-milestones panel once everything is earned, but keeps the earned tiles', () => {
    const { queryByText, getByLabelText } = render(
      <TrophyCabinet achievements={[achievement({ id: 'wins-25', label: 'Win 25 matches', earned: true, progress: 25, target: 25 })]} />,
    );
    expect(queryByText(/next milestones/i)).toBeNull();
    expect(getByLabelText(/win 25 matches.*earned/i)).toBeTruthy();
  });
});

describe('TrophyCabinet — states', () => {
  it('renders nothing at all when there is nothing to show', () => {
    const { toJSON } = render(<TrophyCabinet honors={[]} titles={[]} achievements={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('says what belongs on an empty shelf while milestones are still to come', () => {
    const { getByText } = render(<TrophyCabinet achievements={[achievement()]} />);
    expect(getByText(/honours from organisers, knockout titles and earned milestones/i)).toBeTruthy();
    expect(getByText(/next milestones/i)).toBeTruthy();
  });

  it('shows a skeleton while loading, not the empty case', () => {
    const { getByText, queryByText } = render(<TrophyCabinet achievements={[]} loading />);
    expect(getByText(/trophy cabinet/i)).toBeTruthy();
    expect(queryByText(/next milestones/i)).toBeNull();
  });

  it('shows an error block when the fetch failed, never silence', () => {
    const { getByText } = render(<TrophyCabinet achievements={[]} error />);
    expect(getByText(/couldn.t load achievements/i)).toBeTruthy();
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
