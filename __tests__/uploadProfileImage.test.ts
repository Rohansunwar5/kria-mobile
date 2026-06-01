import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import reducer, { uploadPlayerProfileImage } from '@/store/slices/authSlice';
import { configureStore } from '@reduxjs/toolkit';

const makeStore = () =>
  configureStore({
    reducer: { auth: reducer },
    preloadedState: { auth: { user: { _id: 'u1', firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '1', status: 'active' } } as any },
  });

describe('uploadPlayerProfileImage', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('merges the uploaded image url into the existing user', async () => {
    mock.onPut('/player/auth/profile-image').reply(200, { data: { _id: 'u1', firstName: 'A', profileImage: 'http://img/x.jpg' } });
    const store = makeStore();
    await store.dispatch(uploadPlayerProfileImage({ uri: 'file://a.jpg', name: 'a.jpg', type: 'image/jpeg' }) as any);
    expect(store.getState().auth.user?.profileImage).toBe('http://img/x.jpg');
    expect(store.getState().auth.user?.lastName).toBe('B'); // existing fields preserved
  });
});
