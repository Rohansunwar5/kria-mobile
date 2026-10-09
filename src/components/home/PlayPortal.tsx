import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { StatusPill, Tag } from '@/components/StatusPill';
import { TournamentArt } from '@/components/TournamentArt';
import type { Tournament } from '@/store/slices/tournamentSlice';
import { colors, useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { formatShortDate } from '@/lib/format';
import { inProgress, openForEntryCount, posterCell, posterOrder } from '@/lib/homePortal';
import { formatLabel, isHost, outcomeLabel, statusVariant } from '@/lib/quickMatchView';
import { scoreLine } from '@/lib/quickCricketView';
import type { CareerProfile, RecentMatch } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import type { QuickKnockout } from '@/api/quickKnockout';
import { formatLabel as knockoutFormatLabel } from '@/lib/quickKnockoutView';
import { RecentMatches } from '@/components/profile/RecentMatches';
import { LiveChip } from '@/components/live/LiveRow';
import type { LiveItem } from '@/api/live';
import { HomeHero } from './HomeHero';
import { RANKED_SPORTS, TopPlayers } from './TopPlayers';

// The whole of home, in matchday order: your game, what is live, what you can
// enter, how you have played, the ladder. Designed in docs/home-redesign.html.

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.18 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const MONO = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 10,
  letterSpacing: 0.12 * 10,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const HEADING = {
  fontFamily: 'Anton_400Regular' as const,
  fontSize: 20,
  lineHeight: 24,
  textTransform: 'uppercase' as const,
  color: colors.white,
};

const CARD = {
  borderWidth: 1.5,
  borderColor: colors.line,
  borderRadius: 6,
  backgroundColor: colors.panel,
};

/** A quick match still in progress that did not make the hero, rendered through
 *  the same helpers the quick-match list uses, so the two cannot disagree. */
function LiveRow({ match, playerId }: { match: QuickMatch; playerId?: string }) {
  const theme = useTheme();
  const result = outcomeLabel(match);
  const summary = match.sport === 'cricket' ? (scoreLine(match) ?? 'Not started') : formatLabel(match);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/quick/[id]', params: { id: match._id } })}
      style={{
        ...CARD,
        borderLeftWidth: 4,
        borderLeftColor: colors.brand,
        paddingHorizontal: 13,
        paddingVertical: 11,
        marginBottom: 9,
        minHeight: 44,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Tag label={match.status} variant={statusVariant(match.status)} dot={match.status === 'live'} />
        <Tag label="Quick" variant="up" />
        <View style={{ flex: 1 }} />
        <Text style={MONO(theme)}>{isHost(match, playerId) ? 'Hosting' : 'Playing'}</Text>
      </View>
      <Text
        style={{
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: 18,
          lineHeight: 22,
          color: colors.white,
          marginTop: 8,
        }}
      >
        {`${match.sides[0]?.name} v ${match.sides[1]?.name}`}
      </Text>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.06 * 11, color: colors.brand, marginTop: 5 }}>
        {result ? `${summary} · ${result}` : summary}
      </Text>
    </Pressable>
  );
}

function KnockoutRow({ knockout }: { knockout: QuickKnockout }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: knockout._id } })}
      style={{ ...CARD, borderLeftWidth: 4, borderLeftColor: colors.brand, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 9, minHeight: 44 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Tag label={knockout.status} variant={knockout.status === 'live' ? 'live' : 'open'} dot={knockout.status === 'live'} />
        <Tag label="Knockout" variant="up" />
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, lineHeight: 22, color: colors.white, marginTop: 8 }}>{knockout.name}</Text>
      <Text style={MONO(theme)}>{`${knockoutFormatLabel(knockout)} · ${knockout.players.length} players`}</Text>
    </Pressable>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 9 }}>
      <Text style={HEADING}>{title}</Text>
    </View>
  );
}

/** A horizontal peek row: heading, a count, a "View all" into the full list,
 *  and the cards. Each row hides itself when empty — the full list owns the
 *  empty state. */
function PeekRow({
  title,
  meta,
  live,
  moreLabel,
  onMore,
  children,
}: {
  title: string;
  meta?: string;
  live?: boolean;
  moreLabel: string;
  onMore: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {live ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.brand }} /> : null}
          <Text style={HEADING}>{title}</Text>
        </View>
        {meta ? <Text style={{ ...MONO(theme), paddingBottom: 3 }}>{meta}</Text> : null}
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={moreLabel} onPress={onMore} hitSlop={10}>
          <Text style={{ ...MONO(theme), letterSpacing: 0.1 * 10, color: colors.brand, paddingBottom: 3 }}>View all</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Everything live right now, everyone's, as a ticker. */
function LiveNow({ items, total }: { items: LiveItem[]; total: number }) {
  if (items.length === 0) return null;
  const count = Math.max(total, items.length);
  return (
    <PeekRow
      title="Live now"
      live
      meta={`${count} ${count === 1 ? 'match' : 'matches'}`}
      moreLabel="View all live matches"
      onMore={() => router.push('/live')}
    >
      {items.map((item) => (
        <LiveChip key={`${item.kind}-${item.matchId}`} item={item} />
      ))}
    </PeekRow>
  );
}

/** One organiser tournament as a poster: the art, the name, and a three-cell
 *  data strip whose last cell says what happens next — while entries are open,
 *  the time left to enter. Explore's open-for-entry row reuses it. */
export function TournamentPoster({ tournament }: { tournament: Tournament }) {
  const theme = useTheme();
  const where = [tournament.venue?.name, tournament.venue?.city].filter(Boolean).join(', ');
  const meta = [`${formatShortDate(tournament.startDate)}–${formatShortDate(tournament.endDate)}`, where].filter(Boolean).join(' · ');
  const cells = [
    { label: 'Players', value: String(tournament.registeredPlayersCount ?? 0), urgent: false },
    { label: 'Teams', value: `${tournament.teamsCount ?? 0}/${tournament.settings?.maxTeams || '∞'}`, urgent: false },
    posterCell(tournament),
  ];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tournament.name}
      onPress={() => router.push({ pathname: '/tournament/[id]', params: { id: tournament._id } })}
      style={{
        width: 284,
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: theme.line,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <TournamentArt uri={tournament.bannerImage} seed={tournament._id} height={112} fadeTo={theme.surface} />
      <View style={{ paddingHorizontal: 12, paddingTop: 11, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <StatusPill status={tournament.status} />
          {tournament.sport ? <Tag label={tournament.sport.replace('_', ' ')} /> : null}
        </View>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 21, lineHeight: 26, color: theme.text, marginTop: 2 }}
        >
          {tournament.name}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: theme.textMeta }}>
          {meta}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 12, borderTopWidth: 1.5, borderTopColor: theme.lineFaint }}>
        {cells.map((c, i) => (
          <View
            key={c.label}
            style={{
              flex: i === 2 ? 1.35 : 1,
              paddingHorizontal: 12,
              paddingTop: 9,
              paddingBottom: 11,
              gap: 3,
              ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineFaint } : null),
            }}
          >
            <Text numberOfLines={1} style={{ ...LBL(theme), fontSize: 8, letterSpacing: 0.14 * 8 }}>{c.label}</Text>
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 15, color: c.urgent ? theme.brandInk : theme.text }}>
              {c.value}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/** The newest organiser-hosted tournaments, a peek at the Events tab. */
function LatestTournaments({ tournaments }: { tournaments: Tournament[] }) {
  if (tournaments.length === 0) return null;
  const open = openForEntryCount(tournaments);
  return (
    <PeekRow
      title="Tournaments"
      meta={open > 0 ? `${open} open` : undefined}
      moreLabel="View all tournaments"
      onMore={() => router.navigate('/(tabs)/events')}
    >
      {posterOrder(tournaments).map((t) => (
        <TournamentPoster key={t._id} tournament={t} />
      ))}
    </PeekRow>
  );
}

export interface PlayPortalProps {
  /** Shown on the player card. Comes from cached auth, so it survives every load. */
  playerName: string;
  profile: CareerProfile | null;
  /** The public live feed — every live match, not just yours. */
  liveFeed?: LiveItem[];
  /** How many matches are live in all; the feed may carry fewer. */
  liveTotal?: number;
  /** The newest organiser-hosted tournaments. */
  tournaments?: Tournament[];
  recent: RecentMatch[] | null;
  /**
   * Your quick matches. Only unfinished ones surface at the top: a finished
   * quick match is already a result below, and listing it twice would read as
   * two different matches.
   */
  matches: QuickMatch[];
  playerId?: string;
  /** Unfinished knockouts you host or play in. */
  knockouts?: QuickKnockout[];
  loading: boolean;
  /**
   * The career-profile request actually FAILED. A missing `profile` is not the
   * same thing — a player whose id was never known, or who has simply never
   * played, also has none — and using it as the error proxy put a "Couldn't
   * load your record" block with a dead retry in front of people whose record
   * had never been asked for. `useCareer` reports the two independently
   * (`allSettled`), so a failed feed still cannot blank a record that loaded.
   */
  error: boolean;
  recentError: boolean;
  onRetry: () => void;
}

/**
 * Home. Props-driven: the home screen owns the loading, this owns only how it
 * looks.
 */
export function PlayPortal({
  playerName,
  profile,
  liveFeed = [],
  liveTotal = 0,
  tournaments = [],
  recent,
  matches,
  playerId,
  knockouts = [],
  loading,
  error,
  recentError,
  onRetry,
}: PlayPortalProps) {
  const [topPlayersSport, setTopPlayersSport] = useState(RANKED_SPORTS[0]);
  const [current, ...alsoInProgress] = inProgress(matches, knockouts);
  const ledger = recent ?? [];

  // A player with no history has no results; the first-match guide at the top
  // already says so, so the section is left out rather than given a second
  // empty state saying the same thing. A genuine failure is the exception.
  const showResults = (loading && !recent) || recentError || ledger.length > 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <HomeHero
          current={current ?? null}
          playerName={playerName}
          playerId={playerId}
          profile={profile}
          recent={recent}
          loading={loading}
          error={error}
          onRetry={onRetry}
        />
      </View>

      {/* Anything else in progress lists under the hero, so a second unfinished
          match or knockout never drops off home. */}
      {alsoInProgress.length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          {alsoInProgress.map((item) =>
            item.kind === 'match' ? (
              <LiveRow key={item.match._id} match={item.match} playerId={playerId} />
            ) : (
              <KnockoutRow key={item.knockout._id} knockout={item.knockout} />
            ),
          )}
        </View>
      ) : null}

      <LiveNow items={liveFeed} total={liveTotal} />

      <LatestTournaments tournaments={tournaments} />

      {showResults ? (
        <View>
          <SectionHeading title="Your results" />
          {/* The same results list as both profiles and All matches. */}
          <View style={{ paddingHorizontal: 16 }}>
            <RecentMatches
              matches={recent}
              loading={loading}
              error={recentError}
              onRetry={onRetry}
              limit={4}
              heading={null}
              onSeeAll={playerId ? () => router.push({ pathname: '/matches/[playerId]', params: { playerId } }) : undefined}
            />
          </View>
        </View>
      ) : null}

      <TopPlayers sport={topPlayersSport} onSportChange={setTopPlayersSport} viewerId={playerId} />
    </ScrollView>
  );
}
