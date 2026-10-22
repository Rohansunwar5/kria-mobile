import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listAnnouncements, type Announcement } from '@/api/profileApi';
import { AnnouncementCard } from '@/components/tournament/AnnouncementCard';
import { TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, radius, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { useTournament } from '@/lib/useTournament';

export default function Announcements() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useTournament(id);
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listAnnouncements(id));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const now = new Date();
  return (
    <SafeAreaView style={s.root}>
      <TopBar title="Updates" sub={data?.tournament.name} onBack={() => goBack(router)} />
      {failed ? <InlineError what="Couldn't load the updates." onRetry={load} /> : null}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        {items === null ? (
          !failed && <Skeleton style={s.skel} />
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <Icon name="campaign" size={40} color={colors.text4} />
            <Text style={s.emptyTitle}>No updates yet</Text>
            <Text style={s.emptyLine}>The organiser's updates show here.</Text>
          </View>
        ) : (
          items.map((a) => <AnnouncementCard key={a._id} a={a} now={now} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 40, gap: 12 },
  skel: { height: 110, borderRadius: radius.card },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 80 },
  emptyTitle: { ...display(24) },
  emptyLine: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
});
