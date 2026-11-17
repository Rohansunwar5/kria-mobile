import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { uploadPlayerProfileImage } from '@/store/slices/authSlice';
import { PhotoAvatar } from '@/components/profile/PhotoAvatar';

const asset = { uri: 'file://new.jpg', name: 'avatar.jpg', type: 'image/jpeg' };
const makeStore = (photoUpload: { uri: string; progress: number } | null) =>
  configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@x' }), photoUpload } as never } });
const photoUri = () => screen.getByTestId('avatar-photo').props.source.uri;

it('shows initials and is tappable when idle', () => {
  const onPress = jest.fn();
  render(<Provider store={makeStore(null)}><PhotoAvatar size={128} initials="AR" onPress={onPress} /></Provider>);
  expect(screen.getByText('AR')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Add a profile photo'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('shows the local framing and blocks taps while uploading', () => {
  const onPress = jest.fn();
  render(<Provider store={makeStore({ uri: 'file://new.jpg', progress: 0.5 })}><PhotoAvatar size={128} image="http://img/old.jpg" initials="AR" onPress={onPress} /></Provider>);
  expect(photoUri()).toBe('file://new.jpg');
  fireEvent.press(screen.getByLabelText('Uploading photo'));
  expect(onPress).not.toHaveBeenCalled();
});

it('goes back to the old photo when the upload fails', () => {
  const store = makeStore({ uri: 'file://new.jpg', progress: 0.5 });
  render(<Provider store={store}><PhotoAvatar size={80} image="http://img/old.jpg" initials="AR" onPress={jest.fn()} /></Provider>);
  act(() => { store.dispatch(uploadPlayerProfileImage.rejected(null, 'req', asset, 'Network Error')); });
  expect(photoUri()).toBe('http://img/old.jpg');
  expect(screen.getByLabelText('Change profile photo')).toBeTruthy();
});
