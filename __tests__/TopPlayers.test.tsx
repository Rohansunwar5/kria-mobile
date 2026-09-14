import { render, fireEvent } from '@testing-library/react-native';
import { TopPlayers } from '../src/components/home/TopPlayers';
import type { RankedPlayer } from '../src/api/rankings';

// Jest only allows the mock factory below to close over an out-of-scope
// variable when its name is prefixed `mock` — same pattern as
// HomeScreen.test.tsx's mockFetchPublicTournaments.
const mockUseTopPlayers = jest.fn();
jest.mock('../src/lib/useTopPlayers', () => ({
  useTopPlayers: (sport: string) => mockUseTopPlayers(sport),
}));

const player = (over: Partial<RankedPlayer> = {}): RankedPlayer => ({
  playerId: 'p1',
  firstName: 'Arjun',
  lastName: 'Verma',
  played: 24,
  decided: 24,
  won: 22,
  winRate: 0.92,
  ...over,
});

const reload = jest.fn();

function mockState(over: Partial<{ players: RankedPlayer[]; loading: boolean; error: boolean }> = {}) {
  mockUseTopPlayers.mockReturnValue({ players: [], loading: false, error: false, reload, ...over });
}

const props = (over = {}) => ({
  sport: 'badminton',
  onSportChange: jest.fn(),
  ...over,
});

describe('TopPlayers', () => {
  beforeEach(() => {
    mockUseTopPlayers.mockReset();
    reload.mockReset();
  });

  // The server has already ranked and filtered the list — the component must
  // not re-sort, and rows are numbered 01, 02, 03... from array position.
  it('renders rows in the given order, numbered from 01, without re-sorting', () => {
    mockState({
      players: [
        player({ playerId: 'p1', firstName: 'Kabir', lastName: 'Iyer', winRate: 0.5 }),
        player({ playerId: 'p2', firstName: 'Arjun', lastName: 'Verma', winRate: 0.92 }),
      ],
    });
    const { getByText, getByLabelText } = render(<TopPlayers {...props()} />);
    expect(getByText('01')).toBeTruthy();
    expect(getByText('02')).toBeTruthy();
    // Kabir (lower win rate) stays first because the server put him first —
    // a re-sort by win rate would put Arjun (92%) at rank 01 instead.
    expect(getByLabelText(/rank 1\. kabir iyer/i)).toBeTruthy();
    expect(getByLabelText(/rank 2\. arjun verma/i)).toBeTruthy();
  });

  // `winRate` is a 0-1 fraction from the server; the component renders it as
  // a percentage and must never recompute it from won/decided.
  //
  // won/decided and winRate are DELIBERATELY chosen so the two derivations
  // disagree after rounding: 23/24 recomputed is 95.83% -> rounds to 96%,
  // while the server's own fraction (0.90) renders 90%. Only one of those
  // can pass. Do not "tidy" these numbers back into agreement — that would
  // make the test pass against a component that recomputes, which is
  // exactly the regression this test exists to catch.
  it('renders winRate as a percentage from the fraction, not recomputed from won/decided', () => {
    mockState({ players: [player({ won: 23, decided: 24, winRate: 0.9 })] });
    const { getByText, queryByText } = render(<TopPlayers {...props()} />);
    expect(getByText('90%')).toBeTruthy();
    expect(queryByText('96%')).toBeNull();
  });

  // The viewer's own row is marked for a screen reader too, not only by the
  // auction-accent border DESIGN.md §2 assigns to "you" in any list.
  it('marks the viewer\'s own row, announced to a screen reader and not only by colour', () => {
    mockState({
      players: [
        player({ playerId: 'other', firstName: 'Priya', lastName: 'Nair' }),
        player({ playerId: 'me', firstName: 'Rohan', lastName: 'Sunwar' }),
      ],
    });
    const { getByText, getByLabelText, queryByLabelText } = render(<TopPlayers {...props({ viewerId: 'me' })} />);
    expect(getByText('You')).toBeTruthy();
    expect(getByLabelText(/rohan sunwar, you/i)).toBeTruthy();
    expect(queryByLabelText(/priya nair, you/i)).toBeNull();
  });

  // profileImage is an absent key for most players, not null — InitialsAvatar
  // must still render the row rather than crashing on a missing photo.
  it('renders a player with no profileImage using initials', () => {
    const bare = player({ firstName: 'Deepa', lastName: 'Rao' });
    delete (bare as Partial<RankedPlayer>).profileImage;
    mockState({ players: [bare] });
    const { getByText } = render(<TopPlayers {...props()} />);
    expect(getByText('DR')).toBeTruthy();
    expect(getByText(/deepa rao/i)).toBeTruthy();
  });

  // DESIGN.md §5: empty names what would fill it rather than a bare "no data".
  it('names what would fill the empty state', () => {
    mockState({ players: [] });
    const { getByText, queryByText } = render(<TopPlayers {...props()} />);
    expect(getByText(/badminton leaderboard appears here once ten players/i)).toBeTruthy();
    expect(queryByText(/no data/i)).toBeNull();
  });

  // DESIGN.md §5: the error scopes to this block, with a retry that calls the
  // hook's own reload — the rest of PLAY is untouched by this component.
  it('scopes a load failure to this block, with a working retry', () => {
    mockState({ error: true });
    const { getByText, getByLabelText } = render(<TopPlayers {...props()} />);
    expect(getByText(/couldn.t load top players/i)).toBeTruthy();
    fireEvent.press(getByLabelText('Retry'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('switches sport via the chip, skipping the All sentinel', () => {
    mockState({ players: [] });
    const onSportChange = jest.fn();
    const { getByLabelText, rerender } = render(<TopPlayers {...props({ sport: 'badminton', onSportChange })} />);
    fireEvent.press(getByLabelText(/switch sport, currently badminton/i));
    expect(onSportChange).toHaveBeenCalledWith('cricket');

    // The wrap-around (cricket -> badminton) is the hop that actually depends
    // on skipping the sentinel: an unfiltered cycle over SPORTS
    // ('All' -> 'badminton' -> 'cricket') would also land on 'cricket' from
    // the first press above, so that press alone proves nothing about the
    // sentinel. Only the wrap distinguishes the two implementations, since an
    // unfiltered cycle wraps cricket back to 'All', not 'badminton'.
    rerender(<TopPlayers {...props({ sport: 'cricket', onSportChange })} />);
    fireEvent.press(getByLabelText(/switch sport, currently cricket/i));
    expect(onSportChange).toHaveBeenCalledWith('badminton');
    expect(onSportChange).not.toHaveBeenCalledWith('All');
  });
});
