import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { goBack } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { useLiveFeed } from '@/lib/useLiveFeed';
import LiveRow from '@/components/live/LiveRow';

/** Every live match. Reached from home's "Live now" row, so it is a pushed
 *  screen with a way back, not a tab. */
export default function LiveScreen() {
  const theme = useTheme();
  const { items, total, loading, error, refresh } = useLiveFeed();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: theme.lineSoft }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => goBack(router)}
          hitSlop={8}
          style={{ width: 38, height: 38, borderRadius: 4, backgroundColor: theme.fill, borderWidth: 1.5, borderColor: theme.lineSoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={19} color={theme.text} strokeWidth={2.3} />
        </Pressable>
        <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.text }}>Live now</Text>
      </View>

      <Text style={{
        fontFamily: 'SpaceMono_700Bold',
        fontSize: 9,
        letterSpacing: 0.14 * 9,
        textTransform: 'uppercase',
        color: theme.textFaint,
        paddingHorizontal: 17,
        paddingTop: 10,
      }}>
        {total} matches happening now
      </Text>

      <FlatList
        testID="live-list"
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.matchId}`}
        renderItem={({ item }) => <LiveRow item={item} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 11, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={refresh} tintColor={theme.textFaint} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
          ) : (
            // An error and a quiet evening are different things and must not
            // read the same. The hook clears the list on failure, so this is
            // the only place that distinction is visible to the user.
            <Text style={{
              fontFamily: 'SpaceGrotesk_400Regular',
              fontSize: 14,
              lineHeight: 21,
              color: error ? theme.failInk : theme.textMeta,
              marginTop: 40,
              textAlign: 'center',
            }}>
              {error ? 'Could not load live matches.' : 'Nothing live right now.'}
            </Text>
          )
        }
      />
    </Screen>
  );
}
