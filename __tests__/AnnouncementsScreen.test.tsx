import { render, screen } from '@testing-library/react-native';
import Announcements from '../src/app/tournament/[id]/announcements';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'T1' }),
}));
jest.mock('@/lib/useTournament', () => ({
  useTournament: () => ({ data: { tournament: { name: 'Arohance Open' }, categories: [], mine: [] }, loading: false, error: false, reload: jest.fn() }),
}));
jest.mock('@/api/profileApi', () => ({ listAnnouncements: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { listAnnouncements } = require('@/api/profileApi');

const ann = (id: string, over = {}) => ({ _id: id, tournamentId: 'T1', message: `msg ${id}`, severity: 'info', pinned: false, authorName: 'Org', authorRole: 'organiser', createdAt: new Date().toISOString(), ...over });

describe('Announcements screen', () => {
  it('lists every update newest pinned first', async () => {
    listAnnouncements.mockResolvedValue([ann('a', { pinned: true, title: 'Heads up' }), ann('b'), ann('c')]);
    render(<Announcements />);
    expect(await screen.findByText('msg a')).toBeTruthy();
    expect(screen.getByText('Heads up')).toBeTruthy();
    expect(screen.getByText('msg b')).toBeTruthy();
    expect(screen.getByText('msg c')).toBeTruthy();
    expect(screen.getByText('Updates')).toBeTruthy();
    expect(screen.getByText('Arohance Open')).toBeTruthy();
  });

  it('a failed load says so', async () => {
    listAnnouncements.mockRejectedValue(new Error('net'));
    render(<Announcements />);
    expect(await screen.findByText("Couldn't load the updates.")).toBeTruthy();
  });

  it('empty', async () => {
    listAnnouncements.mockResolvedValue([]);
    render(<Announcements />);
    expect(await screen.findByText('No updates yet')).toBeTruthy();
    expect(screen.getByText("The organiser's updates show here.")).toBeTruthy();
  });
});
