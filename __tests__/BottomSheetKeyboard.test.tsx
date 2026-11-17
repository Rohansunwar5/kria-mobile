import { Keyboard, ScrollView } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { BottomSheet, sheetLift, sheetMaxHeight } from '@/components/ui/BottomSheet';
import { SpotSheet } from '@/components/host/SpotSheet';

jest.mock('@/api/playerSearch', () => ({ searchPlayers: jest.fn(async () => []) }));

it('lifts the sheet so its content clears the keyboard', () => {
  // iOS reports the keyboard including the home-indicator inset the sheet already pads for.
  expect(sheetLift(336, 34, 'ios')).toBe(302);
  // Android reports it above the navigation bar already.
  expect(sheetLift(300, 48, 'android')).toBe(300);
  expect(sheetLift(0, 34, 'ios')).toBe(0);
});

it('caps the sheet to the space between the status bar and the keyboard', () => {
  expect(sheetMaxHeight(800, 30, 300)).toBe(458);
});

it('follows the keyboard while open and lets go when closed', () => {
  const remove = jest.fn();
  const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(() => ({ remove }) as any);
  try {
    const { unmount } = render(<BottomSheet open onClose={jest.fn()} title="Fill this spot"><></></BottomSheet>);
    const events = spy.mock.calls.map((c) => c[0]);
    expect(events).toEqual(expect.arrayContaining(['keyboardWillShow', 'keyboardWillHide']));
    unmount();
    expect(remove).toHaveBeenCalledTimes(events.length);
  } finally {
    spy.mockRestore();
  }
});

it('scrolls the spot options under the name field without eating taps', () => {
  render(<SpotSheet open taken={[]} onPick={jest.fn()} onClose={jest.fn()} />);
  const list = screen.UNSAFE_getByType(ScrollView);
  expect(list.props.keyboardShouldPersistTaps).toBe('handled');
  expect(screen.getByText('Leave it open')).toBeTruthy();
});
