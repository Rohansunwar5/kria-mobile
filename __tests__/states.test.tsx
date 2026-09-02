import { render, fireEvent } from '@testing-library/react-native';
import { Skeleton, EmptyState, ErrorBlock, StaleBanner } from '../src/components/states';
import { StatusPill } from '../src/components/StatusPill';

describe('state patterns', () => {
  it('renders a skeleton without blanking the tree', () => {
    const { toJSON } = render(<Skeleton h={132} />);
    expect(toJSON()).toBeTruthy();
  });

  it('empty state names what would appear and offers the way out', () => {
    const onCta = jest.fn();
    const { getByText } = render(
      <EmptyState title="Nothing here yet" message="Enter a category." cta="Browse events" onCta={onCta} />
    );
    expect(getByText('Nothing here yet')).toBeTruthy();
    fireEvent.press(getByText('Browse events'));
    expect(onCta).toHaveBeenCalled();
  });

  it('error block keeps its label and retries in place', () => {
    const onRetry = jest.fn();
    const { getByText, getByLabelText } = render(
      <ErrorBlock label="Draw unavailable" message="Everything above is from your last visit." onRetry={onRetry} />
    );
    expect(getByText('Draw unavailable')).toBeTruthy();
    fireEvent.press(getByLabelText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('stale banner states how old the number is', () => {
    const { getByText } = render(<StaleBanner secondsAgo={14} />);
    expect(getByText('Reconnecting · Last update 14s ago')).toBeTruthy();
  });
});

describe('StatusPill', () => {
  it('maps tournament status to a solid tag', () => {
    expect(render(<StatusPill status="ongoing" />).getByText('Live')).toBeTruthy();
    expect(render(<StatusPill status="auction_in_progress" />).getByText('Auction')).toBeTruthy();
    // unknown status falls back rather than crashing
    expect(render(<StatusPill status="who_knows" />).getByText('Draft')).toBeTruthy();
  });
});
