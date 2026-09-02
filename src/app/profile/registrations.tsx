import { useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { RegistrationCard } from '@/components/profile/RegistrationCard';
import { Skeleton, EmptyState, ErrorBlock } from '@/components/states';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMyRegistrations, withdrawRegistration } from '@/store/slices/registrationSlice';

export default function Registrations() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { myRegistrations, isLoading, error } = useAppSelector((s) => s.registration);

  useEffect(() => {
    dispatch(fetchMyRegistrations());
  }, [dispatch]);

  const onWithdraw = (id: string) => {
    Alert.alert('Withdraw registration?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => dispatch(withdrawRegistration(id)) },
    ]);
  };

  const unpaid = myRegistrations.filter((r) => r.paymentStatus === 'pending' || r.paymentStatus === 'failed').length;

  const Header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="chevron-left" size={19} color="#fff" strokeWidth={2.3} />
      </Pressable>
      <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, color: '#fff' }}>My entries</Text>
      {unpaid > 0 ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
          {unpaid} unpaid
        </Text>
      ) : null}
    </View>
  );

  if (isLoading && myRegistrations.length === 0) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={140} />
          <Skeleton h={140} />
        </View>
      </Screen>
    );
  }

  if (error && myRegistrations.length === 0) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16 }}>
          <ErrorBlock
            label="Entries unavailable"
            message="Your entries could not be loaded. Your profile still works."
            onRetry={() => dispatch(fetchMyRegistrations())}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {Header}
      {myRegistrations.length === 0 ? (
        <EmptyState
          ghost="0"
          icon="document"
          title="Nothing here yet"
          message="Enter a tournament category and it lands here with your payment, team and match status."
          cta="Browse events"
          onCta={() => router.push('/(tabs)/home')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {myRegistrations.map((reg) => (
            <RegistrationCard key={reg._id} reg={reg} onWithdraw={onWithdraw} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
