import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/lib/theme';
import { useLiveFeed } from '@/lib/useLiveFeed';
import LiveRow from '@/components/live/LiveRow';

export default function LiveScreen() {
  const theme = useTheme();
  const { items, total, loading, error, refresh } = useLiveFeed();

  return (
    <Screen>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1.5,
        borderBottomColor: theme.lineSoft,
      }}>
        <Text style={{
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: 23,
          lineHeight: 28,
          color: theme.text,
        }}>
          Kria
        </Text>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 11, paddingBottom: 110 }}
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
