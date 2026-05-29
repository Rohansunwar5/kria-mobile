import { View, Text, Pressable } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';

export default function Profile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  return (
    <View className="flex-1 items-center justify-center bg-ink px-6">
      <Text className="font-oswald text-2xl text-brand">
        {user ? `${user.firstName} ${user.lastName}` : 'Profile'}
      </Text>
      <Text className="mt-1 font-montserrat text-white">{user?.email}</Text>
      <Pressable className="mt-8 rounded-lg bg-brand px-6 py-3" onPress={() => dispatch(logout())}>
        <Text className="font-montserrat font-semibold text-white">Log out</Text>
      </Pressable>
    </View>
  );
}
