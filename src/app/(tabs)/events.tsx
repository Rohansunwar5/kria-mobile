import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTeamBrands } from '@/api/cricketMatch';
import { getEventFacets, latestTournaments, type EventFacets } from '@/api/tournaments';
import { EventCard, type Crest } from '@/components/EventCard';
import { Featured, PastRow } from '@/components/events/EventRows';
import { Filters } from '@/components/events/Filters';
import { TAB_BAR_SPACE } from '@/components/navigation/TabBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, radius, space } from '@/constants/theme';
import { EVENT_SPORTS, eventQuery, groupEvents, NO_FILTERS, type EventFilters } from '@/lib/eventsList';
import { useAppSelector } from '@/store/hooks';
import type { Tournament } from '@/store/slices/tournamentSlice';

// GET /tournament caps `limit` at 100.
const LIMIT = 100;

/** Events tab (mock 1f): official tournaments; filters mirror the API (sport, status, city). */
export default function Events() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sport?: string }>();
  const [filters, setFilters] = useState<EventFilters>(NO_FILTERS);
  const [saved, setSaved] = useState(false);
  const loggedIn = !!useAppSelector((st) => st.auth.user);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [list, setList] = useState<Tournament[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [facets, setFacets] = useState<EventFacets | null>(null);
  const [crests, setCrests] = useState<Record<string, Crest[]>>({});
  const scroll = useRef<ScrollViewInstance>(null);
  const latest = useRef(0);
  useScrollToTop(scroll);

  // "Find a badminton event" (Rankings) opens this tab on that sport.
  useEffect(() => {
    if (!params.sport) return;
    if (EVENT_SPORTS.includes(params.sport)) setFilters({ ...NO_FILTERS, sport: params.sport });
    router.setParams({ sport: undefined });
  }, [params.sport]);

  // Search waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => setTerm(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = eventQuery(filters, term, saved && loggedIn);
  const key = JSON.stringify(query);
  const load = useCallback(async () => {
    const id = ++latest.current;
    setFailed(false);
    try {
      // Counts are a nicety: the list still shows if they fail.
      const [found, counts] = await Promise.all([
        latestTournaments(LIMIT, JSON.parse(key)),
        getEventFacets(JSON.parse(key)).catch(() => null),
      ]);
      if (id !== latest.current) return; // an older filter's answer
      setList(found);
      setFacets(counts);
    } catch {
      if (id === latest.current) setFailed(true);
    }
  }, [key]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Crests only for auctions: the one place the cards show teams. Asked once per event.
  const asked = useRef(new Set<string>());
  useEffect(() => {
    for (const t of list ?? []) {
      if (t.status !== 'auction_in_progress' || asked.current.has(t._id)) continue;
      asked.current.add(t._id);
      getTeamBrands(t._id).then((brands) => setCrests((c) => ({ ...c, [t._id]: Object.values(brands) })));
    }
  }, [list]);

  const { featured, now, upcoming, past } = groupEvents(list ?? []);
  const filtered = !!(filters.sport || filters.status || filters.city || saved || term.trim().length >= 3);

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom }}>
        <View style={s.header}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={display(40)}>Events</Text>
            <Text style={s.sub}>Tournaments run by Kria organisers</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searching ? 'Close search' : 'Search events'}
            onPress={() => {
              if (searching) setQ('');
              setSearching(!searching);
            }}
            style={s.searchBtn}
          >
            <Icon name={searching ? 'close' : 'search'} size={22} />
          </Pressable>
        </View>
        {searching ? (
          <View style={s.search}>
            <Icon name="search" size={20} color={colors.text4} />
            <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search events" placeholderTextColor={colors.text4} autoCorrect={false} returnKeyType="search" style={s.input} accessibilityLabel="Search events" />
          </View>
        ) : null}
        <Filters value={filters} onChange={setFilters} facets={facets} saved={saved} onSaved={loggedIn ? setSaved : undefined} />

        {failed && !list ? <InlineError what="Couldn't load events." onRetry={load} /> : null}

        {!list && !failed ? (
          <View style={{ paddingTop: 28, paddingHorizontal: space.gutter, gap: 16 }}>
            <Skeleton style={{ height: 196, borderRadius: radius.cardLg }} />
            <Skeleton style={{ width: '70%', height: 26 }} />
            <Skeleton style={{ height: 150, borderRadius: radius.card, marginTop: 28 }} />
          </View>
        ) : null}

        {list && !list.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name="stadium" size={30} color={colors.text4} /></View>
            <Text style={[display(26), { textAlign: 'center' }]}>{filtered ? 'No events match' : 'No events yet'}</Text>
            <Text style={s.emptyLine}>{filtered ? 'Try another sport, status or city.' : "Organisers haven't published a tournament yet."}</Text>
            {filtered ? (
              <Button variant="secondary" label="Clear filters" onPress={() => { setFilters(NO_FILTERS); setQ(''); }} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
            ) : null}
          </View>
        ) : null}

        {failed && list ? <InlineError what="Couldn't refresh events." onRetry={load} /> : null}

        {featured ? (
          <View style={{ paddingTop: 28, paddingHorizontal: space.gutter }}>
            <Featured t={featured} crests={crests[featured._id]} />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: space.gutter, paddingBottom: 28 }}>
          {[{ title: 'Happening now', items: now }, { title: 'Coming up', items: upcoming }].map((g) =>
            g.items.length ? (
              <View key={g.title}>
                <Text style={s.group}>{g.title}</Text>
                {g.items.map((t) => (
                  <View key={t._id} style={{ paddingBottom: 28 }}>
                    <EventCard t={t} width="100%" imageHeight={150} crests={crests[t._id]} />
                  </View>
                ))}
              </View>
            ) : null,
          )}
          {past.length ? (
            <View>
              <Text style={s.group}>Past</Text>
              {past.map((t) => <PastRow key={t._id} t={t} />)}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 10, paddingHorizontal: space.gutter },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  searchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, marginTop: 14, marginHorizontal: space.gutter, paddingHorizontal: 14, borderRadius: radius.input, backgroundColor: colors.surface1 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.text },
  group: { paddingTop: space.sectionGap, paddingBottom: 12, fontFamily: font.semibold, fontSize: 17, color: colors.text },
  empty: { paddingTop: 64, paddingHorizontal: 32, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
