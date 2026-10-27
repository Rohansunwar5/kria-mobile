import { renderHook, act } from '@testing-library/react-native';
import { useResend } from '../src/components/signin/useResend';

describe('useResend', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('counts down from 30 to 0', () => {
    const { result } = renderHook(() => useResend());
    expect(result.current.left).toBe(30);
    expect(result.current.canResend).toBe(false);
    act(() => { jest.advanceTimersByTime(29000); });
    expect(result.current.left).toBe(1);
    expect(result.current.canResend).toBe(false);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.left).toBe(0);
    expect(result.current.canResend).toBe(true);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.left).toBe(0);
  });
  it('follows wall-clock time after a stalled interval', () => {
    const { result } = renderHook(() => useResend());
    act(() => { jest.setSystemTime(Date.now() + 20000); jest.advanceTimersByTime(1000); });
    expect(result.current.left).toBe(9);
  });
  it('restart resets to 30', () => {
    const { result } = renderHook(() => useResend());
    act(() => { jest.advanceTimersByTime(30000); });
    expect(result.current.canResend).toBe(true);
    act(() => result.current.restart());
    expect(result.current.left).toBe(30);
    expect(result.current.canResend).toBe(false);
  });
});
