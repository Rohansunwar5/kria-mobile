import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Icon, type IconName } from '@/components/icons';
import { Tag, type TagVariant } from '@/components/StatusPill';
import { Skeleton, ErrorBlock, Ghost } from '@/components/states';
import { colors, useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { SPORT_ICON, SPORT_LABELS } from '@/lib/sports';
import { formatShortDate } from '@/lib/format';
import { formatLabel, isHost, outcomeLabel, statusVariant } from '@/lib/quickMatchView';
import { scoreLine } from '@/lib/quickCricketView';
import type { CareerProfile, RecentMatch, SportSummary } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import { TopPlayers } from './TopPlayers';

// PlayFull.dc.html / PlayEmpty.dc.html. The masthead, the portal switch and the
// strip above this belong to the screen; the portal starts at host/join.

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

/**
 * The server sends a 0-1 fraction and owns the number — it is never recomputed
 * from won/decided here. A sport with nothing decided reads 0%, not NaN%.
 */
function winPercent(summary: SportSummary): string {
  if (summary.decided === 0 || !Number.isFinite(summary.winRate)) return '0%';
  return `${Math.round(summary.winRate * 100)}%`;
}

/**
 * `13W · 12L · 1NR`. No-results are shown and NOT folded into losses: the
 * server counts them as played and excludes them from the win rate, so hiding
 * them would let the two figures on this card contradict each other.
 */
function recordLine(summary: SportSummary): string {
  const parts = [`${summary.won}W`, `${summary.lost}L`];
  if (summary.tied > 0) parts.push(`${summary.tied}T`);
  if (summary.noResult > 0) parts.push(`${summary.noResult}NR`);
  return parts.join(' · ');
}

const RESULT_TAG: Record<RecentMatch['result'], { label: string; variant: TagVariant }> = {
  won: { label: 'Won', variant: 'open' },
  lost: { label: 'Lost', variant: 'fail' },
  tied: { label: 'Tied', variant: 'up' },
  no_result: { label: 'No result', variant: 'end' },
};

const FORM_TOKEN = (theme: Palette): Record<RecentMatch['result'], { token: string; bg: string; fg: string }> => ({
  won: { token: 'W', bg: colors.open, fg: theme.onOpen },
  lost: { token: 'L', bg: colors.fail, fg: theme.onFail },
  tied: { token: 'T', bg: theme.lineFaint, fg: theme.textBody },
  no_result: { token: 'NR', bg: theme.lineFaint, fg: theme.textFaint },
});

function sportIcon(sport: string): IconName {
  return SPORT_ICON[sport] ?? 'trophy';
}

function sportLabel(sport: string): string {
  return SPORT_LABELS[sport] ?? sport;
}

/** No organiser needed — the one action that fills every empty block below it. */
function HostJoin() {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 13 }}>
      <View
        style={{
          ...CARD,
          borderColor: theme.auctionLine,
          borderLeftWidth: 4,
          borderLeftColor: colors.auction,
          overflow: 'hidden',
        }}
      >
        <Ghost text="QM" size={86} style={{ right: -4, top: -10 }} />
        <View style={{ paddingHorizontal: 14, paddingTop: 13 }}>
          <Text style={{ ...LBL(theme), letterSpacing: 0.22 * 9, color: colors.auction }}>No organiser needed</Text>
          <Text
            style={{
              fontFamily: 'Anton_400Regular',
              textTransform: 'uppercase',
              fontSize: 30,
              lineHeight: 36,
              color: colors.white,
              marginTop: 5,
            }}
          >
            Start a match
          </Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 17, color: theme.textMeta, marginTop: 7 }}>
            Badminton or cricket, scored live. Invite with a six-character code.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 9, padding: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Host a match"
            onPress={() => router.push('/quick/new')}
            style={{
              flex: 1.25,
              minHeight: 48,
              borderRadius: 5,
              backgroundColor: colors.auction,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="plus" size={17} color={theme.onAuction} strokeWidth={2.4} />
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, color: theme.onAuction }}>Host</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join with a code"
            onPress={() => router.push('/quick/join')}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: theme.keylineStrong,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: colors.white }}>Join</Text>
            <Text style={{ ...MONO(theme), fontSize: 11, letterSpacing: 0.14 * 11 }}>Code</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SportCell({
  summary,
  accent,
  right,
  top,
}: {
  summary: SportSummary;
  accent?: boolean;
  right?: boolean;
  top?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: '50%',
        paddingHorizontal: 13,
        paddingVertical: 12,
        ...(right ? { borderRightWidth: 1.5, borderRightColor: theme.lineFaint } : null),
        ...(top ? { borderTopWidth: 1.5, borderTopColor: theme.lineFaint } : null),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={sportIcon(summary.sport)} size={13} color={accent ? colors.auction : theme.textFaint} />
        <Text style={{ ...LBL(theme), letterSpacing: 0.12 * 9, color: theme.textBody }}>{sportLabel(summary.sport)}</Text>
      </View>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 34, lineHeight: 36, color: colors.white, marginTop: 6 }}>
        {winPercent(summary)}
      </Text>
      <Text style={{ ...MONO(theme), letterSpacing: 0.1 * 10, marginTop: 6 }}>{recordLine(summary)}</Text>
    </View>
  );
}

/** The last six results, newest on the right — letter as well as colour, so it
 *  never depends on hue alone. */
function FormStrip({ recent }: { recent: RecentMatch[] }) {
  const theme = useTheme();
  const formToken = FORM_TOKEN(theme);
  const form = recent.slice(0, 6).reverse();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderTopWidth: 1.5,
        borderTopColor: theme.lineFaint,
      }}
    >
      <Text style={{ ...LBL(theme), letterSpacing: 0.12 * 9 }}>Form</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {form.map((m) => {
          const t = formToken[m.result];
          return (
            <View
              key={m._id}
              style={{
                minWidth: 19,
                height: 19,
                borderRadius: 3,
                paddingHorizontal: 3,
                backgroundColor: t.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: t.fg }}>{t.token}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <Text style={{ ...MONO(theme), letterSpacing: 0.1 * 10 }}>Newest</Text>
      <Icon name="chevron-right" size={10} color={theme.textFaint} strokeWidth={2.4} />
    </View>
  );
}

/**
 * Shown only when the server named a best sport. The 10-decided eligibility
 * rule lives on the server alone — re-implementing it here would give the rule
 * two homes and let them drift.
 */
function BestSport({ summary }: { summary: SportSummary }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderTopWidth: 1.5,
        borderTopColor: theme.lineFaint,
      }}
    >
      <Icon name="trophy" size={14} color={colors.auction} />
      <Text style={{ ...MONO(theme), letterSpacing: 0.14 * 10, color: colors.auction }}>
        {`Best sport · ${sportLabel(summary.sport)}`}
      </Text>
    </View>
  );
}

/** Names what would be here, and offers NO action of its own: Host sits
 *  directly above and is the single thing that fills it. */
function EmptyRecord() {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
      <View style={{ ...CARD, borderStyle: 'dashed', borderColor: theme.keyline, overflow: 'hidden' }}>
        <Ghost text="00" size={76} style={{ right: 6, top: -8 }} />
        <View style={{ paddingHorizontal: 14, paddingVertical: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="chart" size={15} color={theme.textFaint} />
            <Text style={{ ...LBL(theme), letterSpacing: 0.14 * 9 }}>Your record</Text>
          </View>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: theme.textMeta, marginTop: 9 }}>
            Win rate, form and best sport appear here once you have played. Tournament matches count towards it too — so
            does anything you score above.
          </Text>
        </View>
      </View>
    </View>
  );
}

/** A quick match still in progress, rendered through the same helpers the
 *  quick-match list uses, so the two surfaces cannot disagree. */
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

/**
 * One ledger row. `title` and `scoreline` are both optional — the participation
 * ledger outlives the matches it describes — so a missing title is NAMED rather
 * than left blank, and a missing scoreline renders nothing at all rather than
 * an empty line.
 */
function LedgerRow({ match }: { match: RecentMatch }) {
  const theme = useTheme();
  const tag = RESULT_TAG[match.result];
  return (
    <View style={{ ...CARD, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Tag label={tag.label} variant={tag.variant} />
        <Tag label={match.context} variant="up" />
        <View style={{ flex: 1 }} />
        <Text style={MONO(theme)}>{formatShortDate(match.playedAt)}</Text>
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
        numberOfLines={2}
      >
        {match.title ?? 'Match unavailable'}
      </Text>
      {match.scoreline ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.06 * 11, color: theme.textMeta, marginTop: 5 }}>
          {match.scoreline}
        </Text>
      ) : null}
    </View>
  );
}

function SectionHeading({ title, meta, metaAccent }: { title: string; meta?: string; metaAccent?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 9,
      }}
    >
      <Text style={HEADING}>{title}</Text>
      {meta ? (
        <Text style={{ ...MONO(theme), letterSpacing: 0.1 * 10, ...(metaAccent ? { color: colors.auction } : null) }}>{meta}</Text>
      ) : null}
    </View>
  );
}

export interface PlayPortalProps {
  profile: CareerProfile | null;
  recent: RecentMatch[] | null;
  /**
   * Your quick matches. Only the live ones surface here: a finished quick match
   * is already a ledger row below, and listing it twice would read as two
   * different matches.
   */
  matches: QuickMatch[];
  playerId?: string;
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
 * The player half of home: host or join a casual match, your record, and the
 * blended recent feed.
 *
 * Props-driven for the same reason `EventsPortal` is — the home screen owns the
 * loading, the portal owns only how it looks.
 */
export function PlayPortal({
  profile,
  recent,
  matches,
  playerId,
  loading,
  error,
  recentError,
  onRetry,
}: PlayPortalProps) {
  const [topPlayersSport, setTopPlayersSport] = useState('badminton');
  const sports = profile ? profile.sports : [];
  const played = sports.reduce((sum, s) => sum + s.played, 0);
  const live = matches.filter((m) => m.status === 'live');
  const ledger = recent ?? [];
  const hasRecord = sports.length > 0;

  // Nothing cached yet: keep the chrome and show the card geometry. Never an
  // ActivityIndicator that blanks the portal (DESIGN.md §5).
  const recordBody = () => {
    if (loading && !profile) {
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <Skeleton h={104} />
          <Skeleton h={42} style={{ marginTop: 9 }} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <ErrorBlock
            label="Your record"
            title="Couldn’t load your record"
            message="Host and join still work. Pull to refresh, or try again in a moment."
            onRetry={onRetry}
          />
        </View>
      );
    }

    // Unreachable — the section below only calls this when there is a record,
    // a load in flight, or a failure — but it is what narrows `profile` for the
    // cells, and it fails to nothing rather than to a false error.
    if (!profile) return null;

    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ ...CARD, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {sports.map((s, i) => (
              <SportCell key={s.sport} summary={s} accent={i === 0} right={i % 2 === 0} top={i >= 2} />
            ))}
          </View>
          {ledger.length > 0 ? <FormStrip recent={ledger} /> : null}
          {profile.bestSport ? <BestSport summary={profile.bestSport} /> : null}
        </View>
      </View>
    );
  };

  const recentBody = () => {
    if (loading && !recent) {
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <Skeleton h={86} />
          <Skeleton h={86} style={{ marginTop: 9 }} />
        </View>
      );
    }

    if (recentError) {
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <ErrorBlock
            label="Recent"
            title="Couldn’t load recent matches"
            message="Pull to refresh, or try again in a moment."
            onRetry={onRetry}
          />
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {live.map((m) => (
          <LiveRow key={m._id} match={m} playerId={playerId} />
        ))}
        {ledger.map((m) => (
          <LedgerRow key={m._id} match={m} />
        ))}
      </View>
    );
  };

  // A player with no history has an empty record AND an empty feed. The record
  // block already says so in words, so the feed is omitted rather than given a
  // second empty state saying the same sentence again. A genuine failure is the
  // exception — that has to be said out loud.
  const showRecent = loading || recentError || live.length > 0 || ledger.length > 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <HostJoin />

      {/* Nothing yet is the first-run state, not a failure: only `loading` and a
          real `error` keep the record section up in place of EmptyRecord. */}
      {hasRecord || loading || error ? (
        <View>
          <SectionHeading title="Your record" meta={played > 0 ? `${played} played` : undefined} />
          {recordBody()}
        </View>
      ) : (
        <EmptyRecord />
      )}

      {showRecent ? (
        <View>
          <SectionHeading title="Recent matches" meta={live.length > 0 ? `${live.length} live` : undefined} metaAccent />
          {recentBody()}
        </View>
      ) : null}

      <TopPlayers sport={topPlayersSport} onSportChange={setTopPlayersSport} viewerId={playerId} />
    </ScrollView>
  );
}
