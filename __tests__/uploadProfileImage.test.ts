import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import reducer, { photoUploadProgress, uploadPlayerProfileImage } from '@/store/slices/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { Image } from 'react-native';

const makeStore = (extra: Record<string, unknown> = {}) =>
  configureStore({
    reducer: { auth: reducer },
    preloadedState: { auth: { ...reducer(undefined, { type: '@@x' }), user: { _id: 'u1', firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '1', status: 'active', ...extra } } as any },
  });
const asset = { uri: 'file://a.jpg', name: 'avatar.jpg', type: 'image/jpeg' };

describe('uploadPlayerProfileImage', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('merges the uploaded image url into the existing user', async () => {
    mock.onPut('/player/auth/profile-image').reply(200, { data: { _id: 'u1', firstName: 'A', profileImage: 'http://img/x.jpg' } });
    const store = makeStore();
    await store.dispatch(uploadPlayerProfileImage(asset) as any);
    expect(store.getState().auth.user?.profileImage).toBe('http://img/x.jpg');
    expect(store.getState().auth.user?.lastName).toBe('B'); // existing fields preserved
  });

  it('tracks the local photo while uploading and clears it after', async () => {
    const store = makeStore();
    let seen: unknown;
    mock.onPut('/player/auth/profile-image').reply(() => { seen = store.getState().auth.photoUpload; return [200, { data: { _id: 'u1', profileImage: 'http://img/y.jpg' } }]; });
    await store.dispatch(uploadPlayerProfileImage(asset) as any);
    expect(seen).toEqual({ uri: 'file://a.jpg', progress: 0 });
    expect(store.getState().auth.photoUpload).toBeNull();
  });

  it('keeps the old photo and clears the upload when it fails', async () => {
    mock.onPut('/player/auth/profile-image').networkError();
    const store = makeStore({ profileImage: 'http://img/old.jpg' });
    await store.dispatch(uploadPlayerProfileImage(asset) as any);
    expect(store.getState().auth.photoUpload).toBeNull();
    expect(store.getState().auth.user?.profileImage).toBe('http://img/old.jpg');
  });

  it('stops waiting for the new photo to preload after 3 seconds', async () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(Image, 'prefetch').mockReturnValue(new Promise<boolean>(() => undefined));
    try {
      mock.onPut('/player/auth/profile-image').reply(200, { data: { _id: 'u1', profileImage: 'http://img/slow.jpg' } });
      const store = makeStore();
      const done = store.dispatch(uploadPlayerProfileImage(asset) as any);
      await jest.advanceTimersByTimeAsync(3000);
      await done;
      expect(store.getState().auth.user?.profileImage).toBe('http://img/slow.jpg');
      expect(store.getState().auth.photoUpload).toBeNull();
    } finally {
      spy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('records progress, capped at 1', () => {
    const s1 = reducer({ ...reducer(undefined, { type: '@@x' }), photoUpload: { uri: 'f', progress: 0 } } as any, photoUploadProgress(0.4));
    expect(s1.photoUpload).toEqual({ uri: 'f', progress: 0.4 });
    expect(reducer(s1, photoUploadProgress(1.7)).photoUpload?.progress).toBe(1);
    expect(reducer(reducer(undefined, { type: '@@x' }), photoUploadProgress(0.5)).photoUpload).toBeNull();
  });
});
