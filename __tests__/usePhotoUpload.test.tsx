import { renderHook, act } from '@testing-library/react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { usePhotoUpload } from '@/components/profile/usePhotoUpload';
import { getPhotoDraft } from '@/lib/photoDraft';

// Expo Go's cache folder is percent-escaped; route params would decode it twice.
const NORM = 'file:///Caches/ExponentExperienceData/%2540anonymous%252Fkria-x/ImageManipulator/n.jpg';
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file://pick.heic', width: 4032, height: 3024 }] })),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async () => ({ uri: 'file:///Caches/ExponentExperienceData/%2540anonymous%252Fkria-x/ImageManipulator/n.jpg', width: 2048, height: 1536 })),
  SaveFormat: { JPEG: 'jpeg' },
}));
beforeEach(() => jest.clearAllMocks());

it('normalises the picked photo and hands it to the crop screen untouched', async () => {
  const { result } = renderHook(() => usePhotoUpload());
  await act(async () => { await result.current.pick(); });
  expect(manipulateAsync).toHaveBeenCalledWith('file://pick.heic', [{ resize: { width: 2048 } }], { compress: 0.9, format: 'jpeg' });
  expect(getPhotoDraft()).toEqual({ uri: NORM, width: 2048, height: 1536 });
  expect(mockPush).toHaveBeenCalledWith('/photo-crop');
});

it('ignores a second tap while the first photo is still being prepared', async () => {
  const { result } = renderHook(() => usePhotoUpload());
  await act(async () => { await Promise.all([result.current.pick(), result.current.pick()]); });
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(1);
});
