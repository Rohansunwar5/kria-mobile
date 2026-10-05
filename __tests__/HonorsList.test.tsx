import { render, screen } from '@testing-library/react-native';
import { HonorsList } from '@/components/profile/HonorsList';
import { badgeFor, CHAMPION } from '@/lib/badges';

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
