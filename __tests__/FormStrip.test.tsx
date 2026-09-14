import { render } from '@testing-library/react-native';
import { FormStrip } from '../src/components/profile/FormStrip';
import { colors } from '../src/lib/theme';
import { dark } from '../src/lib/theme/palette';
import type { RecentMatch } from '../src/api/career';

const match = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'r1',
  matchId: 'm1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  playedAt: '2026-09-09T10:00:00.000Z',
  ...over,
});

describe('FormStrip', () => {
  // The feed arrives newest-first; the strip reverses it so the oldest of the
  // shown results sits at the left and the newest at the right, next to the
  // "Newest ▸" cue on the artboard.
  it('renders oldest-to-newest, left-to-right, from a newest-first feed', () => {
    const recent = [
      match({ _id: 'r3', result: 'won' }),
      match({ _id: 'r2', result: 'lost' }),
      match({ _id: 'r1', result: 'tied' }),
    ];
    const { getAllByText } = render(<FormStrip recent={recent} />);
    const tokens = getAllByText(/^(W|L|T|NR)$/).map((el) => el.props.children);
    expect(tokens).toEqual(['T', 'L', 'W']);
  });

  it('carries the letter as well as the colour for every result, W/L/NR', () => {
    // DESIGN.md §7: colour is never the only signal.
    const recent = [
      match({ _id: 'r3', result: 'won' }),
      match({ _id: 'r2', result: 'lost' }),
      match({ _id: 'r1', result: 'no_result' }),
    ];
    const { getByText } = render(<FormStrip recent={recent} />);
    expect(getByText('W')).toBeTruthy();
    expect(getByText('L')).toBeTruthy();
    expect(getByText('NR')).toBeTruthy();
  });

  it('renders a no_result as NR, visually distinct from a loss', () => {
    const recent = [match({ _id: 'r1', result: 'no_result' })];
    const { getByText, queryByText } = render(<FormStrip recent={recent} />);
    const nrChip = getByText('NR').parent?.parent?.props.style;
    expect(nrChip?.backgroundColor).toBe(dark.lineFaint);
    // A loss uses the fail accent, never the same fill as a no_result.
    expect(nrChip?.backgroundColor).not.toBe(colors.fail);
    // A loss never renders alongside a no_result fixture of one.
    expect(queryByText('L')).toBeNull();
  });

  it('shows only the most recent `limit`, still oldest-to-newest', () => {
    // Newest-first feed: r5 is the most recent, r1 the oldest. limit=2 keeps
    // only r5 and r4 — reversed, so r4 (older of the two) prints first.
    const recent = [
      match({ _id: 'r5', result: 'lost' }),
      match({ _id: 'r4', result: 'won' }),
      match({ _id: 'r3', result: 'tied' }),
      match({ _id: 'r2', result: 'won' }),
      match({ _id: 'r1', result: 'won' }),
    ];
    const { getAllByText } = render(<FormStrip recent={recent} limit={2} />);
    const tokens = getAllByText(/^(W|L|T|NR)$/).map((el) => el.props.children);
    expect(tokens).toEqual(['W', 'L']);
  });

  it('renders nothing for an empty feed', () => {
    const { toJSON } = render(<FormStrip recent={[]} />);
    expect(toJSON()).toBeNull();
  });
});
