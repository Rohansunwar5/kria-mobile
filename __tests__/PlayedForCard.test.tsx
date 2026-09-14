import { render, fireEvent } from '@testing-library/react-native';
import { PlayedForCard } from '../src/components/profile/PlayedForCard';
import { dark } from '../src/lib/theme/palette';
import type { PublicHistoryEntry } from '../src/api/profileApi';

const entry = (over: Partial<PublicHistoryEntry> = {}): PublicHistoryEntry => ({
  _id: 'h1',
  status: 'completed',
  createdAt: '2025-03-01T00:00:00.000Z',
  tournament: { _id: 't1', name: 'Monsoon Premier League', sport: 'cricket' },
  team: { _id: 'team1', name: 'Thunder XI', primaryColor: '#2F6BD8' },
  stats: { matchesPlayed: 12, matchesWon: 8 },
  ...over,
});

describe('PlayedForCard', () => {
  it("uses the team's primaryColor to drive the 38px swatch", () => {
    const { getByText } = render(<PlayedForCard entry={entry()} />);
    // getByText('TX') resolves the host Text; its composite Text wrapper's
    // parent is the View that carries the swatch's own size/colour.
    const swatch = getByText('TX').parent?.parent;
    expect(swatch?.props.style.backgroundColor).toBe('#2F6BD8');
    expect(swatch?.props.style.width).toBe(38);
  });

  it('falls back to the brand token, never an undefined colour, when primaryColor is missing', () => {
    const { getByText } = render(
      <PlayedForCard entry={entry({ team: { _id: 'team1', name: 'Thunder XI' } })} />
    );
    expect(getByText('TX').parent?.parent?.props.style.backgroundColor).toBe(dark.brand);
  });

  it('renders the tournament name and the sport tag', () => {
    const { getByText } = render(<PlayedForCard entry={entry()} />);
    expect(getByText(/monsoon premier league/i)).toBeTruthy();
    expect(getByText(/cricket/i)).toBeTruthy();
  });

  it('shows played and won from stats', () => {
    const { getByText } = render(
      <PlayedForCard entry={entry({ stats: { matchesPlayed: 9, matchesWon: 7 } })} />
    );
    expect(getByText('9')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('shows 0 rather than blank for played and won when stats are absent', () => {
    const { getAllByText } = render(<PlayedForCard entry={entry({ stats: undefined })} />);
    expect(getAllByText('0')).toHaveLength(2);
  });

  it('is pressable and announced as an enabled button when tournament._id exists', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<PlayedForCard entry={entry()} onPress={onPress} />);
    const card = getByLabelText('Thunder XI');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityState.disabled).toBe(false);
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not pressable, and announces disabled via role and state, when there is no tournament', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <PlayedForCard entry={entry({ tournament: undefined })} onPress={onPress} />
    );
    const card = getByLabelText('Thunder XI');
    expect(card.props.accessibilityRole).toBeUndefined();
    expect(card.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(card);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('omits the third stat cell entirely when no soldPrice prop is given', () => {
    // The public profile screen (PublicHistoryEntry) has nothing to pass here
    // — the server's whitelist never includes auction financials. An empty
    // "Sold for —" cell would be noise, so the cell itself must not render.
    const { queryByText } = render(<PlayedForCard entry={entry()} />);
    expect(queryByText(/sold for/i)).toBeNull();
  });

  it('renders the third cell, formatted, when a caller passes soldPrice', () => {
    // A caller with a real figure — the player's own authenticated history,
    // not the public entry — passes it as a prop rather than the card
    // reading it off `entry`.
    const { getByText } = render(<PlayedForCard entry={entry()} soldPrice={24000} />);
    expect(getByText(/sold for/i)).toBeTruthy();
    expect(getByText('₹24k')).toBeTruthy();
  });
});
