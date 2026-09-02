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
};
