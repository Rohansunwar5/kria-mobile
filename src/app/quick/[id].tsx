import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Skeleton, ErrorBlock } from '@/components/states';
import { MatchPanel } from '@/components/quick/MatchPanel';
import { useQuickMatch } from '@/lib/useQuickMatch';
import { useAppSelector } from '@/store/hooks';

export default function QuickMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const { match, loading, error, busy, reload, point, undo, cancel, removePlayer } = useQuickMatch(id);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
            Back
          </Text>
        </Pressable>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, color: '#fff', marginLeft: 14 }}>
          Quick match
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && Boolean(match)} onRefresh={reload} tintColor="#F97316" />}
      >
        {loading && !match ? (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Skeleton h={28} w="45%" line />
            <Skeleton h={120} />
            <Skeleton h={56} />
          </View>
        ) : null}

        {error && !match ? (
          <View style={{ paddingHorizontal: 20 }}>
            <ErrorBlock label="Quick match" onRetry={reload} />
          </View>
        ) : null}

        {match ? (
          <MatchPanel
            match={match}
            playerId={user?._id}
            busy={busy}
            onPoint={point}
            onUndo={undo}
            onCancel={cancel}
            onRemovePlayer={removePlayer}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
