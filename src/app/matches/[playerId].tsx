import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/nav';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { RecentMatches } from '@/components/profile/RecentMatches';
import { getRecentMatches, type RecentMatch } from '@/api/career';
import { useTheme } from '@/lib/theme';

export default function AllMatches() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const [matches, setMatches] = useState<RecentMatch[] | null>(null);
  const [error, setError] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!playerId) return;
    let live = true;
    // ponytail: endpoint caps at 50, add a before-cursor when a player passes 50 matches
    getRecentMatches(playerId, 50).then(
      (m) => live && (setError(false), setMatches(m)),
      () => live && setError(true),
    );
    return () => {
      live = false;
    };
  }, [playerId, attempt]);

  const load = () => {
    setError(false);
    setAttempt((n) => n + 1);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => goBack(router, '/(tabs)/profile')}
          hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: theme.fill, borderWidth: 1.5, borderColor: theme.lineSoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={19} color={theme.text} strokeWidth={2.3} />
        </Pressable>
        <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.text }}>All matches</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <RecentMatches matches={matches} loading={!matches && !error} error={error} onRetry={load} all />
      </ScrollView>
    </Screen>
  );
}
