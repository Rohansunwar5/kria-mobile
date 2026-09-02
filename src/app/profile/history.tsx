import { useEffect } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { HistoryCard } from '@/components/profile/HistoryCard';
import { EmptyState } from '@/components/states';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';

export default function History() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { tournamentHistory, historyLoading } = useAppSelector((s) => s.registration);

  useEffect(() => { dispatch(fetchPlayerTournamentHistory()); }, [dispatch]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tournament History' }} />
      {historyLoading && tournamentHistory.length === 0 ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#F97316" /></View>
      ) : tournamentHistory.length === 0 ? (
        <View className="p-5"><EmptyState ghost="0" icon="time-outline" title="No history yet" message="Tournaments you have played land here with your results and awards." cta="Browse events" onCta={() => router.push('/(tabs)/home')} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {tournamentHistory.map((entry) => <HistoryCard key={entry._id} entry={entry} />)}
        </ScrollView>
      )}
    </Screen>
  );
}
