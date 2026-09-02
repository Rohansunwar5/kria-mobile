import { useEffect } from 'react';
import { ScrollView, View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { RegistrationCard } from '@/components/profile/RegistrationCard';
import { EmptyState } from '@/components/states';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMyRegistrations, withdrawRegistration } from '@/store/slices/registrationSlice';

export default function Registrations() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { myRegistrations, isLoading } = useAppSelector((s) => s.registration);

  useEffect(() => { dispatch(fetchMyRegistrations()); }, [dispatch]);

  const onWithdraw = (id: string) => {
    Alert.alert('Withdraw registration?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => dispatch(withdrawRegistration(id)) },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'My Registrations' }} />
      {isLoading && myRegistrations.length === 0 ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" /></View>
      ) : myRegistrations.length === 0 ? (
        <View className="p-5"><EmptyState ghost="0" icon="clipboard-outline" title="Nothing here yet" message="Enter a tournament category and it lands here with your payment, team and match status." cta="Browse events" onCta={() => router.push('/(tabs)/home')} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {myRegistrations.map((reg) => <RegistrationCard key={reg._id} reg={reg} onWithdraw={onWithdraw} />)}
        </ScrollView>
      )}
    </Screen>
  );
}
