import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Intro from '../src/app/(auth)/intro';
import { latestTournaments } from '@/api/tournaments';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@/api/tournaments', () => ({ latestTournaments: jest.fn() }));
const mockLatest = latestTournaments as jest.Mock;

const tournament = { _id: 't1', name: 'City Open', status: 'registration_open', bannerImage: 'https://x/b.png', startDate: '2099-03-14T00:00:00Z', venue: { city: 'Pune' } };

async function toPage3() {
  fireEvent.press(screen.getByLabelText('Next'));
  fireEvent.press(screen.getByLabelText('Next'));
  await act(async () => {});
}

describe('Intro', () => {
  beforeEach(() => { mockPush.mockClear(); mockLatest.mockReset(); mockLatest.mockResolvedValue([]); });

  it('steps through the pages', async () => {
    render(<Intro />);
    expect(screen.getByText('Host a match in seconds.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(screen.getByText('Climb the leaderboard.')).toBeTruthy();
    expect(screen.getByText(/badminton and cricket/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Skip'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
    await act(async () => {});
  });

  it('page 3 has no Skip and creates the account', async () => {
    render(<Intro />);
    await toPage3();
    expect(screen.queryByLabelText('Skip')).toBeNull();
    fireEvent.press(screen.getByLabelText('Create my account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });

  it('shows the real open tournament', async () => {
    mockLatest.mockResolvedValue([{ ...tournament, status: 'ongoing' }, tournament]);
    render(<Intro />);
    await toPage3();
    expect(screen.getByText('City Open')).toBeTruthy();
    expect(screen.getByText('Registration open')).toBeTruthy();
  });

  it('still renders when the list fails', async () => {
    mockLatest.mockRejectedValue(new Error('down'));
    render(<Intro />);
    await toPage3();
    expect(screen.getByText('Enter real tournaments.')).toBeTruthy();
    expect(screen.queryByText('City Open')).toBeNull();
  });

  it('uses no mock sample names', () => {
    render(<Intro />);
    ['Neha', 'Karthik', 'K R 7'].forEach((t) => expect(screen.queryByText(new RegExp(t))).toBeNull());
  });
});
