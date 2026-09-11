import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EventsPortal } from '@/components/home/EventsPortal';
import { FilterSheet } from '@/components/home/FilterSheet';
import { PlayPortal } from '@/components/home/PlayPortal';
import { PortalSwitch } from '@/components/home/PortalSwitch';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { listMyQuickMatches, type QuickMatch } from '@/api/quickMatch';
import { hasLiveQuickMatch, openForEntryCount, portalStrip, type Portal } from '@/lib/homePortal';
import { useCareer } from '@/lib/useCareer';
import { colors } from '@/lib/theme';
import { EMPTY_FILTERS, clearOne, toQuery, type Filters } from '@/lib/tournamentFilters';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPublicTournaments } from '@/store/slices/tournamentSlice';

/**
 * One portal's slot. Both portals stay MOUNTED for the life of the screen and
 * the inactive one is hidden here, because unmounting threw away everything the
 * user had built up on the other side: the events FlatList's scroll offset went
 * back to the top and the featured card's art re-entered on every crossing.
 *
 * `display: 'none'` is the hide, not opacity or a zero height: Yoga honours it
 * by taking the pane out of layout entirely, so the visible pane still gets the
 * whole flex box. A transparent pane would keep its layout box and halve the
 * other one, and would still be tappable.
 *
 * Hidden has to mean hidden to everyone — `pointerEvents` for fingers, and both
 * accessibility props because iOS reads one and Android the other. Without them
 * VoiceOver would happily read out a portal nobody can see.
 */
function PortalPane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <View
      style={active ? { flex: 1 } : { display: 'none' }}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

// The server's getAllTournamentsValidator caps `limit` at 100
// (server/src/middlewares/validators/tournament.validator.ts) — asking for
// more gets the whole request rejected. Real pagination is the correct
// long-term fix for showing more than this many events; until it exists,
// both the fetch below and the filter sheet's promised count read this same
// constant so the two can never drift apart the way they did when the sheet
// quoted the server's true total while the fetch silently capped at 20.
const TOURNAMENT_FETCH_LIMIT = 100;

// Two Filters are the same choice even when they are different objects — the
// sheet's toggle() always spreads a fresh object, so selecting a value and
// then unselecting it before Apply produces a value-identical but
// reference-different Filters. The load effect below keys off `filters`
// identity, so without this check that round trip would refetch for nothing
// and flash the stale-dim over a list that was never going to change.
function sameFilters(a: Filters, b: Filters): boolean {
  return a.sport === b.sport && a.city === b.city && a.status === b.status;
}

export default function Home() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { publicTournaments, publicTotal, isLoading, error } = useAppSelector((s) => s.tournament);
  const user = useAppSelector((s) => s.auth.user);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [portal, setPortal] = useState<Portal>('events');
  const [matches, setMatches] = useState<QuickMatch[]>([]);

  const load = () =>
    dispatch(
      fetchPublicTournaments({
        limit: TOURNAMENT_FETCH_LIMIT,
        ...toQuery(filters),
      })
    );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters]);

  const career = useCareer(user?._id);

  // Loaded on every focus regardless of which portal is showing: the live dot
  // on the PLAY tab is the one reason to cross over unprompted, so it has to be
  // right *before* you look at it.
  const loadMatches = useCallback(async () => {
    try {
      setMatches(await listMyQuickMatches());
    } catch {
      // A failed list leaves the dot as it was. The portal owns the retry.
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMatches(); }, [loadMatches]));

  const firstName = user?.firstName || 'Player';

  const open = (id: string) => router.push({ pathname: '/tournament/[id]', params: { id } });
  const onClearFilter = (key: keyof Filters) => setFilters((f) => clearOne(f, key));
  const onOpenFilters = () => setSheetOpen(true);

  const isPlay = portal === 'play';
  const accent = isPlay ? colors.auction : colors.brand;

  // The strip says OPEN, so it counts what is actually open for entry — not
  // every visible tournament. Counting the visible set let a screenful of
  // finished events announce itself as open.
  const openCount = openForEntryCount(publicTournaments);
  const played = career.profile?.sports.reduce((n, s) => n + s.played, 0) ?? 0;
  const live = hasLiveQuickMatch(matches);

  // Masthead renders from cached auth state, so it survives every load and
  // every error — the whole point of the Patterns sheet.
  const Masthead = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}>
        <Image source={require('../../../assets/images/logo.png')} resizeMode="contain" style={{ width: 33, height: 29 }} />
        {/* The canvas draws Kria at 23/21. That is a CSS line box; on iOS the
            line box is compressed to lineHeight and the caps are shaved, which
            is what __tests__/antonLeading.test.ts fences at 1.188em. 23px needs
            27.3px, so the leading is 28 and the size is the design's. */}
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 23, lineHeight: 28, color: '#fff' }}>
          Kria
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => router.push('/(tabs)/profile')}
          hitSlop={6}
        >
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={{ width: 38, height: 38, borderRadius: 4 }} />
          ) : (
            <InitialsAvatar name={firstName} size={38} />
          )}
        </Pressable>
      </View>

      {/* The hazard rule now belongs only to an art edge. Under the masthead a
          plain hairline carries a short tab in the live portal's accent. */}
      <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.10)' }}>
        <View style={{ position: 'absolute', left: 16, top: 0, width: 54, height: 2, backgroundColor: accent }} />
      </View>
    </View>
  );

  return (
    <Screen>
      {Masthead}

      <PortalSwitch portal={portal} live={live} onChange={setPortal} />

      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 9,
          letterSpacing: 0.14 * 9,
          textTransform: 'uppercase',
          color: isPlay ? colors.auction : '#7d7d7d',
          paddingHorizontal: 17,
          paddingTop: 9,
        }}
      >
        {portalStrip(portal, { openCount, city: filters.city, played, live })}
      </Text>

      {/* Self-scrolling siblings: PlayPortal owns a ScrollView and EventsPortal
          a FlatList, so they sit side by side here, never nested in an outer
          scroller. Both stay mounted — see PortalPane — so crossing a portal
          keeps the other side's scroll position and animation state. Neither
          costs anything while hidden: both are presentational, every request on
          this screen is fired by the screen itself, above. */}
      <View style={{ flex: 1 }}>
        <PortalPane active={!isPlay}>
          <EventsPortal
            tournaments={publicTournaments}
            isLoading={isLoading}
            error={error}
            filters={filters}
            onClearFilter={onClearFilter}
            onOpenFilters={onOpenFilters}
            onOpen={open}
            onRetry={load}
          />
        </PortalPane>

        <PortalPane active={isPlay}>
          <PlayPortal
            profile={career.profile}
            recent={career.recent}
            matches={matches}
            playerId={user?._id}
            loading={career.loading}
            error={career.error}
            recentError={career.recentError}
            onRetry={career.reload}
          />
        </PortalPane>
      </View>

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        // Honest caveat: this count reflects the filters currently applied,
        // not the draft being edited inside the sheet, because the server is
        // only asked once the user taps Apply — there is no live per-tap
        // count. That would need a count-only endpoint; the applied count is
        // what ships. Said here so the next reader does not file this as a
        // bug.
        //
        // Capped at TOURNAMENT_FETCH_LIMIT: `publicTotal` is the server's true
        // count (countDocuments), which can be larger than what a single
        // fetch of TOURNAMENT_FETCH_LIMIT rows will actually return — the
        // button must never promise more events than the list can show.
        resultCount={Math.min(publicTotal, TOURNAMENT_FETCH_LIMIT)}
        onApply={(f) => {
          // Skip the update entirely when nothing actually changed, so the
          // load effect's `filters` dependency keeps the same reference and
          // never refetches for a no-op edit (see sameFilters above).
          setFilters((prev) => (sameFilters(prev, f) ? prev : f));
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
