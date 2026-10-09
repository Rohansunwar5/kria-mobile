import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/icons';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hairlines } from '@/components/canvas';
import { Ghost, Skeleton } from '@/components/states';
import LiveRow from '@/components/live/LiveRow';
import { TournamentPoster } from '@/components/home/PlayPortal';
import { RANKED_SPORTS } from '@/components/home/TopPlayers';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';
import { winPercent } from '@/lib/format';
import { SPORT_ICON, SPORT_LABELS, tournamentSports } from '@/lib/sports';
import { CITIES } from '@/lib/tournamentConstants';
import type { Filters } from '@/lib/tournamentFilters';
import { MIN_QUERY_LENGTH } from '@/lib/useExploreSearch';
import { useTopPlayers } from '@/lib/useTopPlayers';
import type { LiveItem } from '@/api/live';
import type { Tournament } from '@/store/slices/tournamentSlice';

// Explore before (and instead of) a search: what you can browse without
// typing. Every section reads data the app already fetches for Home.

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.18 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const CHIP = (theme: Palette) => ({
  minHeight: 44,
  maxWidth: '100%' as const,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 7,
  paddingHorizontal: 11,
  borderRadius: 5,
  borderWidth: 1.5,
  borderColor: theme.keyline,
});

const CHIP_TEXT = (theme: Palette) => ({
  flexShrink: 1,
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 10,
  letterSpacing: 0.08 * 10,
  textTransform: 'uppercase' as const,
  color: theme.textBody,
});

/** Opens the Events tab pre-filtered. `at` makes every tap a fresh param set,
 *  so a tile re-applies its filter even after the user cleared it there. */
function openEvents(filter: Partial<Filters>) {
  router.navigate({ pathname: '/(tabs)/events', params: { ...filter, at: String(Date.now()) } });
}

export function GroupHeading({ label, count, right, live }: { label: string; count?: number | string; right?: ReactNode; live?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 17, paddingBottom: 9 }}>
      {live ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: theme.brand }} /> : null}
      <Text style={{ ...LBL(theme), ...(live ? { color: theme.brandInk } : null) }}>{label}</Text>
      <View style={{ flex: 1, height: 1.5, backgroundColor: theme.lineFaint }} />
      {count !== undefined ? (
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: theme.textFaint }}>{count}</Text>
      ) : null}
      {right}
    </View>
  );
}

function HeadingAction({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} hitSlop={14}>
      <Text style={{ ...LBL(theme), letterSpacing: 0.1 * 9, color: theme.brandInk }}>{label}</Text>
    </Pressable>
  );
}

/** The server will not search below three letters; say how many are left so a
 *  short query never reads as "no results". */
export function KeepTyping({ typed }: { typed: number }) {
  const theme = useTheme();
  const left = MIN_QUERY_LENGTH - typed;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 11 }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: MIN_QUERY_LENGTH }, (_, i) => (
          <View key={i} style={{ width: 18, height: 4, backgroundColor: i < typed ? theme.brand : theme.surfaceAlt }} />
        ))}
      </View>
      <Text style={{ ...LBL(theme), color: theme.textMeta }}>
        {left} more {left === 1 ? 'letter' : 'letters'} to search
      </Text>
    </View>
  );
}

export function RecentSearches({
  items,
  label,
  onPick,
  onClear,
}: {
  items: string[];
  label: string;
  onPick: (query: string) => void;
  onClear: () => void;
}) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <View>
      <GroupHeading label={label} right={<HeadingAction label="Clear" a11y="Clear recent searches" onPress={onClear} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((q) => (
          <Pressable key={q} accessibilityRole="button" accessibilityLabel={`Search ${q} again`} onPress={() => onPick(q)} style={CHIP(theme)}>
            <Icon name="clock" size={12} color={theme.textFaint} strokeWidth={2.2} />
            <Text style={CHIP_TEXT(theme)} numberOfLines={1}>{q}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** One tile per sport the app serves. Counts appear only once the open list
 *  has loaded — a failed fetch must not read as "0 open". */
export function SportTiles({ open, live }: { open: Tournament[] | null; live: LiveItem[] }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {RANKED_SPORTS.map((sport) => {
        const label = SPORT_LABELS[sport] ?? sport;
        const icon = SPORT_ICON[sport] ?? 'trophy';
        const openCount = open?.filter((t) => tournamentSports(t).includes(sport)).length;
        const liveCount = live.filter((i) => i.sport === sport).length;
        return (
          <Pressable
            key={sport}
            accessibilityRole="button"
            accessibilityLabel={`${label} events`}
            onPress={() => openEvents({ sport })}
            style={{
              flex: 1,
              minHeight: 112,
              padding: 12,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: theme.line,
              backgroundColor: theme.surface,
              overflow: 'hidden',
              justifyContent: 'space-between',
            }}
          >
            <Hairlines />
            <View style={{ position: 'absolute', right: -18, bottom: -22 }} pointerEvents="none">
              <Icon name={icon} size={104} color={theme.fill} strokeWidth={1.6} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Icon name={icon} size={26} color={theme.brandInk} />
              <Icon name="chevron-right" size={14} color={theme.textFaint} strokeWidth={2.2} />
            </View>
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 24, color: theme.text }}>
                {label}
              </Text>
              {openCount !== undefined ? (
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: theme.textMeta, marginTop: 4 }}>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', color: theme.text }}>{openCount}</Text> open
                  {liveCount > 0 ? <Text style={{ color: theme.brandInk }}>{`  ${liveCount} live`}</Text> : null}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The first two live matches; the Live screen has the rest. */
export function LiveNow({ items, total }: { items: LiveItem[]; total: number }) {
  if (items.length === 0) return null;
  return (
    <View>
      <GroupHeading
        label="Live now"
        count={Math.max(total, items.length)}
        right={<HeadingAction label="All" a11y="View all live matches" onPress={() => router.push('/live')} />}
      />
      {items.slice(0, 2).map((item) => (
        <LiveRow key={`${item.kind}-${item.matchId}`} item={item} />
      ))}
    </View>
  );
}

export function OpenForEntry({ tournaments }: { tournaments: Tournament[] }) {
  if (tournaments.length === 0) return null;
  return (
    <View>
      <GroupHeading
        label="Open for entry"
        count={tournaments.length}
        right={<HeadingAction label="All" a11y="View all events open for entry" onPress={() => openEvents({ status: 'registration_open' })} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {tournaments.slice(0, 8).map((t) => (
          <TournamentPoster key={t._id} tournament={t} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Sideways, as avatar tiles — Home already has the ranked list. */
export function TopPlayersRail({ sport, onSportChange }: { sport: string; onSportChange: (sport: string) => void }) {
  const theme = useTheme();
  const { players, loading, error } = useTopPlayers(sport);
  const label = SPORT_LABELS[sport] ?? sport;
  const next = RANKED_SPORTS[(RANKED_SPORTS.indexOf(sport) + 1) % RANKED_SPORTS.length];

  return (
    <View>
      <GroupHeading
        label="Top players"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch sport, currently ${label}`}
            onPress={() => onSportChange(next)}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 3, borderWidth: 1.5, borderColor: theme.keyline }}
          >
            <Text style={{ ...LBL(theme), letterSpacing: 0.1 * 9, color: theme.textBody }}>{label}</Text>
            <Icon name="chevron-down" size={10} color={theme.textFaint} strokeWidth={2.2} />
          </Pressable>
        }
      />
      {players.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {players.slice(0, 10).map((p, i) => {
            const name = `${p.firstName} ${p.lastName}`.trim();
            const rate = winPercent(p.winRate, p.decided);
            return (
              <Pressable
                key={p.playerId}
                accessibilityRole="button"
                accessibilityLabel={`Rank ${i + 1}. ${name}. ${rate} win rate.`}
                onPress={() => router.push({ pathname: '/player/[playerId]', params: { playerId: p.playerId } })}
                style={{ width: 92, gap: 6 }}
              >
                <View>
                  <InitialsAvatar name={name} size={92} logo={p.profileImage} />
                  <View style={{ position: 'absolute', left: 0, top: 0, backgroundColor: theme.bg, borderBottomRightRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: i === 0 ? theme.brandInk : theme.text }}>#{i + 1}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, color: theme.text }}>{name}</Text>
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: theme.textMeta }}>
                  <Text style={{ fontFamily: 'SpaceMono_700Bold', color: theme.openInk }}>{rate}</Text> · {p.played} played
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : loading ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={92} w={92} />)}
        </View>
      ) : (
        <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textFaint }}>
          {error ? 'Could not load rankings.' : `No ranked ${label.toLowerCase()} players yet.`}
        </Text>
      )}
    </View>
  );
}

/** `label: null` drops the heading; `onPick` defaults to opening Events. */
export function CityChips({
  label = 'Events by city',
  exclude,
  onPick = (city) => openEvents({ city }),
}: {
  label?: string | null;
  exclude?: string;
  onPick?: (city: string) => void;
}) {
  const theme = useTheme();
  return (
    <View>
      {label ? <GroupHeading label={label} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CITIES.slice(1).filter((city) => city !== exclude).map((city) => (
          <Pressable key={city} accessibilityRole="button" accessibilityLabel={`Events in ${city}`} onPress={() => onPick(city)} style={CHIP(theme)}>
            <Icon name="location" size={13} color={theme.brandInk} />
            <Text style={CHIP_TEXT(theme)}>{city}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Says why nothing matched, then hands the screen back to browsing. Only
 *  shown with no filter applied, so "0 events" is the whole truth. */
export function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 6, overflow: 'hidden' }}>
      <Ghost text="0" size={210} style={{ right: -14, top: -6 }} />
      <Text style={{ ...LBL(theme), color: theme.failInk }}>0 players · 0 events</Text>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 31, color: theme.text, marginTop: 10 }}>
        Nothing matched “{query}”
      </Text>
      <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textMeta, marginTop: 10, maxWidth: 290 }}>
        Player names match from the first letter, so try just a first name or a surname.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onClear}
        style={{ alignSelf: 'flex-start', marginTop: 16, height: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 5, borderWidth: 1.5, borderColor: theme.keylineStrong }}
      >
        <Icon name="close" size={13} color={theme.text} strokeWidth={2.4} />
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text }}>New search</Text>
      </Pressable>
    </View>
  );
}
