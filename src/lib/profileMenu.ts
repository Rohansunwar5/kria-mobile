import type { IconName } from '@/components/icons';

export interface MenuItem {
  label: string;
  icon: IconName;
  href: string;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

/**
 * The profile menu, grouped rather than flat.
 *
 * "Find Tournaments" is deliberately absent: the Events tab is one tap away in
 * the nav bar, so a row that only duplicates it is noise. Log out is not a
 * group member either — it sits apart, below everything.
 */
export function groupMenu(): MenuGroup[] {
  return [
    {
      title: 'Playing',
      items: [
        { label: 'My entries', icon: 'document', href: '/profile/registrations' },
        { label: 'Tournament history', icon: 'clock', href: '/profile/history' },
        { label: 'Payments', icon: 'receipt', href: '/profile/invoices' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Edit profile', icon: 'person', href: '/profile/edit' },
        { label: 'Settings', icon: 'settings', href: '/profile/settings' },
      ],
    },
  ];
}
