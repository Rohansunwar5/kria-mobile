jest.mock('@/lib/haptics', () => ({ haptics: { press: jest.fn(), select: jest.fn() } }));
import { fireEvent, render, screen } from '@testing-library/react-native';
import { haptics } from '@/lib/haptics';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { TabBar } from '@/components/navigation/TabBar';

beforeEach(() => jest.clearAllMocks());

test('primary sits on a lip and fires the press haptic on press-in', () => {
  render(<Button label="Start match" onPress={() => {}} />);
  expect(screen.getByTestId('button-lip')).toBeTruthy();
  fireEvent(screen.getByLabelText('Start match'), 'pressIn');
  expect(haptics.press).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Start match').props.maxFontSizeMultiplier).toBe(1.3);
});

test('a busy primary neither presses nor fires the haptic', () => {
  const onPress = jest.fn();
  render(<Button label="Confirm teams" busy onPress={onPress} />);
  fireEvent(screen.getByLabelText('Confirm teams'), 'pressIn');
  fireEvent.press(screen.getByText('Confirm teams'));
  expect(onPress).not.toHaveBeenCalled();
  expect(haptics.press).not.toHaveBeenCalled();
});

test('secondary and disabled primary have no lip and no haptic', () => {
  render(
    <>
      <Button variant="secondary" label="Invite" onPress={() => {}} />
      <Button label="Pay" disabled onPress={() => {}} />
    </>,
  );
  expect(screen.queryByTestId('button-lip')).toBeNull();
  fireEvent(screen.getByLabelText('Invite'), 'pressIn');
  expect(haptics.press).not.toHaveBeenCalled();
});

test('segmented fires select only on a change', () => {
  const onChange = jest.fn();
  render(<Segmented options={[{ key: 'a', label: 'Singles' }, { key: 'b', label: 'Doubles' }]} value="a" onChange={onChange} />);
  fireEvent.press(screen.getByText('Singles'));
  expect(haptics.select).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Doubles'));
  expect(haptics.select).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenLastCalledWith('b');
  expect(screen.getByText('Doubles').props.maxFontSizeMultiplier).toBe(1.3);
});

test('toggle fires select through the haptic map', () => {
  render(<Toggle label="Example setting" value={false} onChange={() => {}} />);
  fireEvent.press(screen.getByLabelText('Example setting'));
  expect(haptics.select).toHaveBeenCalledTimes(1);
});

test('tab bar fires select on a different tab only, and caps its labels', () => {
  const navigateToTab = jest.fn();
  const routes = ['home', 'compete', 'events', 'awards', 'profile'].map((name) => ({ name, key: `${name}-key` }));
  const props = {
    state: { index: 0, routes },
    emitter: { emit: () => ({ defaultPrevented: false }) },
    navigateToTab,
  } as unknown as Parameters<typeof TabBar>[0];
  render(<TabBar {...props} />);
  fireEvent.press(screen.getByLabelText('Home'));
  expect(haptics.select).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Compete'));
  expect(haptics.select).toHaveBeenCalledTimes(1);
  expect(navigateToTab).toHaveBeenCalledWith('compete-key');
  expect(screen.getByText('Compete').props.maxFontSizeMultiplier).toBe(1.3);
});
