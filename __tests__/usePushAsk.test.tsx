import { renderHook, waitFor } from '@testing-library/react-native';
import { getItem } from '@/lib/secureStore';
import { pushPermission } from '@/lib/push';
import { usePushAsk } from '@/lib/usePushAsk';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: jest.requireActual('react').useEffect,
  router: { push: (...a: unknown[]) => mockPush(...a) },
}));
jest.mock('@/lib/push', () => ({ pushPermission: jest.fn() }));
jest.mock('@/lib/secureStore', () => ({ getItem: jest.fn() }));

const permission = pushPermission as jest.Mock;
const stored = getItem as jest.Mock;
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  permission.mockResolvedValue('undetermined');
  stored.mockResolvedValue(null);
});

describe('Home push ask', () => {
  it('sends an undecided player to the ask once', async () => {
    const { rerender } = renderHook(() => usePushAsk());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/turn-on-notifications'));
    rerender({});
    await settle();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('does not once the key is set', async () => {
    stored.mockResolvedValue('1');
    renderHook(() => usePushAsk());
    await settle();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['granted', 'denied'])('does not when %s', async (p) => {
    permission.mockResolvedValue(p);
    renderHook(() => usePushAsk());
    await settle();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not when the permission call throws', async () => {
    permission.mockRejectedValue(new Error('Expo Go'));
    renderHook(() => usePushAsk());
    await settle();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
