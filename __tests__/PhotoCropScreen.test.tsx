import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { manipulateAsync } from 'expo-image-manipulator';
import authReducer from '@/store/slices/authSlice';
import PhotoCrop from '@/app/photo-crop';
import { setPhotoDraft } from '@/lib/photoDraft';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({

  useRouter: () => ({ back: mockBack }),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async () => ({ uri: 'file://c.jpg', width: 512, height: 512 })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => undefined), ImpactFeedbackStyle: { Light: 'light' } }));
const mockUpload = jest.fn();
const mockPanConfig = jest.fn();
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler');
  return { ...actual, usePanGesture: (cfg: unknown) => { mockPanConfig(cfg); return actual.usePanGesture(cfg); } };
});
jest.mock('@/store/slices/authSlice', () => {
  const actual = jest.requireActual('@/store/slices/authSlice');
  return {
    ...actual, __esModule: true, default: actual.default,
    uploadPlayerProfileImage: (a: unknown) => { mockUpload(a); return () => ({ unwrap: async () => ({}) }); },
  };
});

it('crops the centred cover view to 512 and uploads it', async () => {
  setPhotoDraft({ uri: 'file://n.jpg', width: 900, height: 1200 });
  const store = configureStore({ reducer: { auth: authReducer } });
  render(<GestureHandlerRootView><Provider store={store}><PhotoCrop /></Provider></GestureHandlerRootView>);
  fireEvent(screen.getByTestId('crop-stage'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 348, height: 600 } } });
  fireEvent.press(screen.getByText('Use photo'));
  await waitFor(() => expect(mockUpload).toHaveBeenCalledWith({ uri: 'file://c.jpg', name: 'avatar.jpg', type: 'image/jpeg' }));
  expect(manipulateAsync).toHaveBeenCalledWith(
    'file://n.jpg',
    [{ crop: { originX: 0, originY: 150, width: 900, height: 900 } }, { resize: { width: 512, height: 512 } }],
    { compress: 0.8, format: 'jpeg' },
  );
  expect(mockBack).toHaveBeenCalled();
});

beforeEach(() => jest.clearAllMocks());
const renderCrop = () => {
  setPhotoDraft({ uri: 'file://n.jpg', width: 900, height: 1200 });
  const store = configureStore({ reducer: { auth: authReducer } });
  const view = render(<GestureHandlerRootView><Provider store={store}><PhotoCrop /></Provider></GestureHandlerRootView>);
  fireEvent(screen.getByTestId('crop-stage'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 348, height: 600 } } });
  return view;
};
const holdCrop = () => {
  let finish: (v: unknown) => void = () => undefined;
  (manipulateAsync as jest.Mock).mockImplementationOnce(() => new Promise((r) => { finish = r; }));
  return (v = { uri: 'file://c.jpg', width: 512, height: 512 }) => finish(v);
};

it('averages touches so a pinch on Android does not drag toward one finger', () => {
  renderCrop();
  expect(mockPanConfig).toHaveBeenCalledWith(expect.objectContaining({ averageTouches: true }));
});

it('ignores Cancel while the photo is being cropped', async () => {
  const finish = holdCrop();
  renderCrop();
  fireEvent.press(screen.getByText('Use photo'));
  fireEvent.press(screen.getByText('Cancel'));
  expect(mockBack).not.toHaveBeenCalled();
  finish();
  await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('uploads nothing if the screen is left while cropping', async () => {
  const finish = holdCrop();
  const { unmount } = renderCrop();
  fireEvent.press(screen.getByText('Use photo'));
  unmount();
  finish();
  await new Promise((r) => setTimeout(r, 0));
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});
