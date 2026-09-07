import type { TagVariant } from '@/components/StatusPill';

export const CITIES = ['All', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Hyderabad', 'Kolkata'];
export const SPORTS = ['All', 'badminton', 'cricket'];

export const STATUS_TAG: Record<string, { label: string; variant: TagVariant; dot?: boolean }> = {
  registration_open: { label: 'Open', variant: 'open' },
  registration_closed: { label: 'Closed', variant: 'fail' },
  auction_in_progress: { label: 'Auction', variant: 'auction' },
  ongoing: { label: 'Live', variant: 'live', dot: true },
  upcoming: { label: 'Upcoming', variant: 'up' },
  completed: { label: 'Ended', variant: 'end' },
  cancelled: { label: 'Cancelled', variant: 'fail' },
  draft: { label: 'Draft', variant: 'end' },
  // Category statuses (ICategoryStatus) — 'ongoing'/'completed' are shared above.
  setup: { label: 'Setup', variant: 'end' },
  registration: { label: 'Open', variant: 'open' },
  auction: { label: 'Auction live', variant: 'auction', dot: true },
  groups_configured: { label: 'Groups set', variant: 'up' },
  bracket_configured: { label: 'Draw out', variant: 'up' },
};
