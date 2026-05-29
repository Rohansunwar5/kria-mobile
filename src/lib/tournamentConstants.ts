export const CITIES = ['All', 'Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Hyderabad', 'Kolkata'];
export const SPORTS = ['All', 'badminton', 'bowling', 'cricket', 'football', 'basketball', 'tennis', 'volleyball'];

export const STATUS_LABEL: Record<string, { label: string; classes: string }> = {
  registration_open: { label: 'Open', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  registration_closed: { label: 'Closed', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  ongoing: { label: 'Live', classes: 'bg-brand/10 text-brand border-brand/20' },
  upcoming: { label: 'Upcoming', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  completed: { label: 'Ended', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  draft: { label: 'Draft', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};
