import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { Tag, type TagVariant } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, EmptyState, Ghost } from '@/components/states';
import { useAppSelector } from '@/store/hooks';
import { listAnnouncements, type Announcement } from '@/api/profileApi';

const SEVERITY: Record<Announcement['severity'], { label: string; variant: TagVariant; edge: string }> = {
  info: { label: 'Notice', variant: 'up', edge: 'rgba(255,255,255,0.14)' },
  important: { label: 'Important', variant: 'fail', edge: '#FF4438' },
  schedule_change: { label: 'Schedule change', variant: 'live', edge: '#F97316' },
};

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}H AGO`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
}

export default function Announcements() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTournament } = useAppSelector((s) => s.tournament);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setItems(await listAnnouncements(id));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 16, color: '#fff' }}>Announcements</Text>
        {currentTournament?.name ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 4 }}>
            {currentTournament.name}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        {Header}
        <View style={{ padding: 16, gap: 10 }}>
          <Skeleton h={96} />
          <Skeleton h={96} />
          <Skeleton h={96} />
        </View>
      </Screen>
    );
  }

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F97316" />;

  if (error) {
    return (
      <Screen>
        {Header}
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16 }}>
          <ErrorBlock label="Board unavailable" message="Announcements could not be loaded. Pull to retry." onRetry={load} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      {Header}
      {items.length === 0 ? (
        <ScrollView refreshControl={refresh} contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyState
            icon="message"
            title="Nothing announced"
            message="Schedule changes and organiser notices for this tournament land here."
          />
        </ScrollView>
      ) : (
        <ScrollView refreshControl={refresh} contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Ghost text="NOTE" size={130} style={{ right: -30, top: 220 }} />
          {items.map((a) => {
            const s = SEVERITY[a.severity] ?? SEVERITY.info;
            return (
              <View
                key={a._id}
                style={{
                  backgroundColor: '#151515',
                  borderWidth: 1.5,
                  borderColor: a.pinned ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.14)',
                  borderLeftWidth: 4,
                  borderLeftColor: s.edge,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingTop: 11 }}>
                  <Tag label={s.label} variant={s.variant} dot={a.severity === 'schedule_change'} />
                  {a.pinned ? <Tag label="Pinned" variant="auction" /> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, color: '#7d7d7d' }}>
                    {when(a.createdAt)}
                  </Text>
                </View>

                {a.title ? (
                  <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 17, color: '#fff', paddingHorizontal: 13, paddingTop: 9 }}>
                    {a.title}
                  </Text>
                ) : null}

                <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: '#d4d4d4', paddingHorizontal: 13, paddingTop: a.title ? 6 : 9, paddingBottom: 11 }}>
                  {a.message}
                </Text>

                <View style={{ paddingHorizontal: 13, paddingBottom: 11 }}>
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
                    {a.authorName} · {a.authorRole}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
