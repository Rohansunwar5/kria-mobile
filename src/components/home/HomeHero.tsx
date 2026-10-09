import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost, Skeleton, ErrorBlock } from '@/components/states';
import { FormStrip } from '@/components/profile/FormStrip';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { SPORT_LABELS } from '@/lib/sports';
import { winPercent } from '@/lib/format';
import type { InProgress } from '@/lib/homePortal';
import { formatLabel, freeSlots, isHost } from '@/lib/quickMatchView';
import { chaseLine, scoreLine } from '@/lib/quickCricketView';
import { formatLabel as knockoutFormatLabel } from '@/lib/quickKnockoutView';
import type { CareerProfile, RecentMatch } from '@/api/career';
import type { QuickGameScore, QuickMatch } from '@/api/quickMatch';
import type { QuickKnockout } from '@/api/quickKnockout';

// The top of home. It changes with your state: the match you are in, your
// player card between matches, or a first-match guide on a new account.
// Designed in docs/home-redesign.html.

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.16 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const CARD = (theme: Palette) => ({
  borderWidth: 1.5,
  borderColor: theme.line,
  borderRadius: 6,
  backgroundColor: theme.surface,
  overflow: 'hidden' as const,
});

function sportLabel(sport: string): string {
  return SPORT_LABELS[sport] ?? sport;
}

/** The one solid action at the foot of an in-progress hero. */
function Cta({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: 5,
        backgroundColor: theme.brand,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 17, lineHeight: 21, color: theme.onBrand }}>
        {label}
      </Text>
      <Icon name="arrow-right" size={17} color={theme.onBrand} strokeWidth={2.4} />
    </Pressable>
  );
}

/** Host lives in the nav; between matches the card only offers the join. Six
 *  slots, one per character of the code the host shares. */
function JoinBar() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Join with a code"
      onPress={() => router.push('/quick/join')}
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: theme.keylineStrong,
        backgroundColor: theme.bg,
      }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 20, color: theme.text }}>Join</Text>
      <Text style={{ ...LBL(theme), color: theme.textMeta }}>With code</Text>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ width: 12, height: 18, borderBottomWidth: 2, borderBottomColor: theme.textFaint }} />
        ))}
      </View>
      <Icon name="arrow-right" size={16} color={theme.text} strokeWidth={2.2} />
    </Pressable>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 20, color: theme.text }}>{value}</Text>
      <Text style={LBL(theme)}>{label}</Text>
    </View>
  );
}

/**
 * Between matches: your name, one sport at a time, and the join. Your best
 * sport leads when the server names one. The form strip follows the sport on
 * show, so a cricket loss never sits under a badminton win rate.
 */
function PlayerCard({
  name,
  profile,
  recent,
  loading,
  error,
  onRetry,
}: {
  name: string;
  profile: CareerProfile | null;
  recent: RecentMatch[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const [picked, setPicked] = useState<string | null>(null);
  const sports = profile?.sports ?? [];
  const best = profile?.bestSport?.sport;
  const summary = sports.find((s) => s.sport === picked) ?? sports.find((s) => s.sport === best) ?? sports[0];
  const pct = summary ? winPercent(summary.winRate, summary.decided) : '';
  // `played` counts no-results and `decided` does not, so a tie or no-result is
  // named beside won–lost rather than leaving the figures to disagree.
  const recordLabel = summary
    ? ['Won–lost', summary.tied ? `${summary.tied} T` : null, summary.noResult ? `${summary.noResult} NR` : null].filter(Boolean).join(' · ')
    : '';

  const body = () => {
    // Nothing cached yet: keep the card and its join, skeleton the figures
    // (DESIGN.md §5).
    if (loading && !profile) {
      return (
        <View style={{ gap: 9 }}>
          <Skeleton h={30} w="45%" />
          <Skeleton h={64} />
        </View>
      );
    }
    if (error) {
      return (
        <ErrorBlock
          label="Your record"
          title="Couldn’t load your record"
          message="Joining still works. Try again in a moment."
          onRetry={onRetry}
        />
      );
    }
    if (!summary) return null;
    return (
      <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {sports.map((s) => {
            const on = s.sport === summary.sport;
            return (
              <Pressable
                key={s.sport}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${sportLabel(s.sport)}, ${winPercent(s.winRate, s.decided)} win rate${s.sport === best ? ', best sport' : ''}`}
                onPress={() => setPicked(s.sport)}
                hitSlop={7}
                style={{
                  minHeight: 30,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderColor: on ? theme.text : theme.line,
                }}
              >
                {s.sport === best ? <Icon name="trophy" size={11} color={theme.auctionInk} /> : null}
                <Text style={{ ...LBL(theme), letterSpacing: 0.14 * 9, color: on ? theme.text : theme.textFaint }}>
                  {on ? sportLabel(s.sport) : `${sportLabel(s.sport)} · ${winPercent(s.winRate, s.decided)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 58, lineHeight: 62, letterSpacing: -1, color: theme.text }}>
              {pct.slice(0, -1)}
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, color: theme.textMeta }}>%</Text>
            </Text>
            <Text style={LBL(theme)}>{`Win rate · ${summary.decided} decided`}</Text>
          </View>
          <View style={{ gap: 8 }}>
            <Mini value={String(summary.played)} label="Played" />
            <Mini value={`${summary.won}–${summary.lost}`} label={recordLabel} />
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={CARD(theme)}>
      <Hairlines />
      {summary && !error ? <Ghost text={pct.slice(0, -1)} size={200} style={{ right: -14, top: 4 }} /> : null}
      <View style={{ padding: 14, gap: 12 }}>
        <Text style={{ ...LBL(theme), color: theme.auctionInk }}>Your game</Text>
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 34, lineHeight: 41, color: theme.text }}
        >
          {name}
        </Text>
        {body()}
      </View>
      {summary && !error ? <FormStrip recent={(recent ?? []).filter((m) => m.sport === summary.sport)} limit={5} /> : null}
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: summary && !error ? 2 : 0 }}>
        <JoinBar />
      </View>
    </View>
  );
}

/** A new account with nothing played: the three steps of a first match, and
 *  both ways in. This is the one state where home offers Host itself. */
function FirstMatch() {
  const theme = useTheme();
  const steps = [
    'Host a badminton or cricket match.',
    'Share the six-character code so the others can join.',
    'Score it live. The result starts your record.',
  ];
  return (
    <View style={{ ...CARD(theme), borderColor: theme.auctionLine }}>
      <Ghost text="QM" size={120} style={{ right: -6, top: 8 }} />
      <View style={{ padding: 14, gap: 12 }}>
        <Text style={{ ...LBL(theme), color: theme.auctionInk }}>No organiser needed</Text>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 30, lineHeight: 36, color: theme.text, maxWidth: 260 }}>
          Your first match starts here
        </Text>
        <View style={{ gap: 9 }}>
          {steps.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: theme.auction,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: theme.auctionInk }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textBody, paddingTop: 2 }}>
                {step}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Host a match"
            onPress={() => router.push('/quick/host')}
            style={{
              flex: 1.25,
              minHeight: 48,
              borderRadius: 5,
              backgroundColor: theme.auction,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="plus" size={17} color={theme.onAuction} strokeWidth={2.4} />
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 16, lineHeight: 20, color: theme.onAuction }}>Host</Text>
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
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 19, color: theme.text }}>Join</Text>
            <Text style={LBL(theme)}>Code</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Badminton, game by game. The game in progress is the one with no winner yet;
 * it sits on a lifted cell in the brand ink. Decided games show the winner's
 * score in white and the loser's faint.
 */
function Scoreboard({ match }: { match: QuickMatch }) {
  const theme = useTheme();
  const games: QuickGameScore[] = match.gameScores?.length ? match.gameScores : [{ gameNumber: 1, side1Score: 0, side2Score: 0 }];
  const sides = match.sides.slice(0, 2);
  const score = (g: QuickGameScore, i: number) => (i === 0 ? g.side1Score : g.side2Score);
  const label = sides.map((s, i) => `${s.name} ${games.map((g) => score(g, i)).join(', ')}`).join('. ');
  const cell = { width: 40, alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <View
      accessible
      accessibilityLabel={`Score: ${label}.`}
      style={{ borderWidth: 1.5, borderColor: theme.line, borderRadius: 5, overflow: 'hidden', backgroundColor: theme.bg }}
    >
      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
        <View style={{ flex: 1 }} />
        {games.map((g) => (
          <View key={g.gameNumber} style={cell}>
            <Text style={LBL(theme)}>{`G${g.gameNumber}`}</Text>
          </View>
        ))}
      </View>
      {sides.map((side, i) => (
        <View key={side.sideId} style={{ flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: theme.lineSoft }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              paddingLeft: 12,
              paddingVertical: 8,
              fontFamily: 'Anton_400Regular',
              textTransform: 'uppercase',
              fontSize: 19,
              lineHeight: 23,
              color: theme.text,
            }}
          >
            {side.name}
          </Text>
          {games.map((g) => {
            const now = !g.winnerSideId;
            const won = g.winnerSideId === side.sideId;
            return (
              <View key={g.gameNumber} style={{ ...cell, backgroundColor: now ? theme.surfaceAlt : 'transparent' }}>
                <Text
                  style={{
                    fontFamily: 'SpaceMono_700Bold',
                    fontSize: now ? 22 : 18,
                    color: now ? theme.brandInk : won ? theme.text : theme.textFaint,
                  }}
                >
                  {score(g, i)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** A quick match of yours that is live or still filling its waiting room. */
function MatchHero({ match, knockout, playerId }: { match: QuickMatch; knockout?: QuickKnockout; playerId?: string }) {
  const theme = useTheme();
  const live = match.status === 'live';
  const hosting = isHost(match, playerId);
  const cricket = match.sport === 'cricket';
  const title = `${match.sides[0]?.name} v ${match.sides[1]?.name}`;
  const format = cricket ? (match.matchConfig?.maxOvers ? `${match.matchConfig.maxOvers} overs` : null) : formatLabel(match);
  // A knockout match says which knockout and round, as its own screen does.
  const fixture = knockout?.fixtures.find((f) => f.fixtureId === match.fixtureId);
  const round = fixture ? knockout?.roundNames[fixture.round - 1] : undefined;
  const meta = [knockout?.name, round, sportLabel(match.sport), format].filter(Boolean).join(' · ');
  const slots = match.sides.flatMap((s) => s.slots).length;
  const joined = slots - freeSlots(match).length;
  const cta = !live ? 'Open waiting room' : hosting ? 'Resume scoring' : 'Open match';
  const chase = cricket ? chaseLine(match) : null;

  return (
    <View style={CARD(theme)}>
      {live ? <Hazard /> : null}
      <Ghost text={live ? 'Live' : 'QM'} size={150} style={{ right: -10, bottom: -12 }} />
      <View style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Tag label={live ? 'Live' : 'Waiting'} variant={live ? 'live' : 'open'} dot={live} />
          <Tag label={match.knockoutId ? 'Knockout' : 'Quick'} variant="up" />
          <View style={{ flex: 1 }} />
          <Text style={LBL(theme)}>{hosting ? 'Hosting' : 'Playing'}</Text>
        </View>
        <Text style={{ ...LBL(theme), color: theme.textMeta }}>{meta}</Text>

        {!live ? (
          <View style={{ gap: 10 }}>
            <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 31, color: theme.text }}>
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={LBL(theme)}>Code</Text>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, letterSpacing: 4, color: theme.text }}>{match.joinCode}</Text>
              </View>
              <Text style={{ ...LBL(theme), color: theme.textMeta }}>{`${joined}/${slots} joined`}</Text>
            </View>
          </View>
        ) : cricket ? (
          <View style={{ gap: 6 }}>
            <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 27, color: theme.text }}>
              {title}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 34, color: theme.text }}>{scoreLine(match) ?? 'Not started'}</Text>
            {chase ? <Text style={{ ...LBL(theme), color: theme.brandInk }}>{chase}</Text> : null}
          </View>
        ) : (
          <Scoreboard match={match} />
        )}

        <Cta
          label={cta}
          a11y={`${cta}, ${title}`}
          onPress={() => router.push({ pathname: '/quick/[id]', params: { id: match._id } })}
        />
      </View>
    </View>
  );
}

function KnockoutHero({ knockout }: { knockout: QuickKnockout }) {
  const theme = useTheme();
  const live = knockout.status === 'live';
  return (
    <View style={CARD(theme)}>
      {live ? <Hazard /> : null}
      <Ghost text="KO" size={150} style={{ right: -6, bottom: -12 }} />
      <View style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Tag label={live ? 'Live' : 'Waiting'} variant={live ? 'live' : 'open'} dot={live} />
          <Tag label="Knockout" variant="up" />
        </View>
        <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 31, color: theme.text }}>
          {knockout.name}
        </Text>
        <Text style={{ ...LBL(theme), color: theme.textMeta }}>
          {`${knockoutFormatLabel(knockout)} · ${knockout.players.length} players`}
        </Text>
        <Cta
          label="Open knockout"
          a11y={`Open knockout, ${knockout.name}`}
          onPress={() => router.push({ pathname: '/knockout/[id]', params: { id: knockout._id } })}
        />
      </View>
    </View>
  );
}

export interface HomeHeroProps {
  /** The most urgent unfinished thing of yours, if any — see `inProgress`. */
  current: InProgress | null;
  playerName: string;
  playerId?: string;
  profile: CareerProfile | null;
  recent: RecentMatch[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function HomeHero({ current, playerName, playerId, profile, recent, loading, error, onRetry }: HomeHeroProps) {
  if (current?.kind === 'match') return <MatchHero match={current.match} knockout={current.knockout} playerId={playerId} />;
  if (current?.kind === 'knockout') return <KnockoutHero knockout={current.knockout} />;
  if (!loading && !error && (profile?.sports.length ?? 0) === 0) return <FirstMatch />;
  return <PlayerCard name={playerName} profile={profile} recent={recent} loading={loading} error={error} onRetry={onRetry} />;
}
