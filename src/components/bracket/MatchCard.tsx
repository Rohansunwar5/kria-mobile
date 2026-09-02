import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Match } from '@/api/match';
import { Competitor, getCompetitors, scoreboardLink } from '@/lib/bracketView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Icon } from '@/components/icons';
import { Tag } from '@/components/StatusPill';

function CompetitorRow({
  c,
  games,
  side,
  live,
}: {
  c: Competitor;
  games: string;
  side: 1 | 2;
  live: boolean;
}) {
  const dim = c.isTBD || c.isBye;
  const score = c.score ?? null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
        opacity: dim ? 0.35 : 1,
        backgroundColor: c.isWinner ? 'rgba(22,196,106,0.07)' : 'transparent',
      }}
    >
      {dim ? (
        <View style={{ width: 30, height: 30, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }} />
      ) : (
        <InitialsAvatar name={c.name} size={30} neutral={side === 2 && !c.isWinner} />
      )}
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Anton_400Regular',
            textTransform: 'uppercase',
            fontSize: 17,
            color: c.isWinner ? '#16C46A' : side === 1 ? '#fff' : '#d4d4d4',
          }}
        >
          {c.name}
        </Text>
        {c.teamName && !dim ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 3 }}>
            {c.teamName}
          </Text>
        ) : null}
      </View>
      {games ? (
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#7d7d7d' }}>{games}</Text>
      ) : null}
      {score !== null ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 20, color: live || c.isWinner ? '#fff' : '#7d7d7d', width: 30, textAlign: 'right' }}>
          {score}
        </Text>
      ) : null}
    </View>
  );
}

export function MatchCard({
  match,
  competitorType,
  logoById,
  sport,
  isMine,
}: {
  match: Match;
  competitorType: 'player' | 'team';
  logoById?: Record<string, string | undefined>;
  /** Resolved once per category — see categorySport(). */
  sport?: string;
  /** Marks the match the signed-in player is in, in the auction magenta. */
  isMine?: boolean;
}) {
  const router = useRouter();
  const { c1, c2 } = getCompetitors(match, competitorType, logoById);
  const link = scoreboardLink(match, sport);
  const live = match.status === 'in_progress';
  const done = match.status === 'completed' || match.status === 'walkover';

  // Per-game runs, badminton only — cricket matches carry no gameScores.
  const games = (match.gameScores || []).slice().sort((a, b) => a.gameNumber - b.gameNumber);
  const runFor = (slot: 1 | 2) =>
    games.length > 1 ? games.slice(0, -1).map((g) => (slot === 1 ? g.team1Score : g.team2Score)).join(' ') : '';

  const court = match.schedule?.court ? `Court ${match.schedule.court}` : null;
  const when = match.schedule?.time || null;
  const strip = live
    ? [court, 'On now'].filter(Boolean).join(' · ')
    : [court, when].filter(Boolean).join(' · ') || `Match ${match.matchNumber}`;

  const accent = live ? '#F97316' : isMine ? '#FA4C93' : null;

  const body = (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 13,
          paddingVertical: 7,
          backgroundColor: live ? '#F97316' : isMine ? 'rgba(250,76,147,0.14)' : 'rgba(255,255,255,0.04)',
        }}
      >
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: live ? '#0B0B0B' : isMine ? '#FA4C93' : '#7d7d7d' }}>
          {strip}
        </Text>
        {isMine && !live ? <Tag label="You" variant="auction" /> : null}
        {live && games.length ? (
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, color: '#0B0B0B' }}>
            G{games[games.length - 1].gameNumber}
          </Text>
        ) : null}
        {done && !isMine ? <Tag label="Done" variant="end" /> : null}
      </View>

      <CompetitorRow c={c1} games={runFor(1)} side={1} live={live} />
      <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <CompetitorRow c={c2} games={runFor(2)} side={2} live={live} />

      {link ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 13,
            paddingVertical: 9,
            minHeight: 44,
            borderTopWidth: 1.5,
            borderTopColor: link === 'live' ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.10)',
            backgroundColor: link === 'live' ? 'rgba(249,115,22,0.10)' : 'transparent',
          }}
        >
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.1 * 9, textTransform: 'uppercase', color: link === 'live' ? '#F97316' : '#7d7d7d' }}>
            {link === 'live' ? 'Watch point by point' : 'View result sheet'}
          </Text>
          <Icon name="chevron-right" size={15} color={link === 'live' ? '#F97316' : '#7d7d7d'} strokeWidth={2.8} />
        </View>
      ) : null}
    </>
  );

  const frame = {
    backgroundColor: '#151515',
    borderWidth: 1.5,
    borderColor: live ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.14)',
    borderRadius: 6,
    overflow: 'hidden' as const,
    ...(accent && !live ? { borderLeftWidth: 4, borderLeftColor: accent } : null),
  };

  if (link) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${c1.name} versus ${c2.name}`}
        onPress={() => router.push({ pathname: '/live/[matchId]', params: { matchId: match._id } })}
        style={frame}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={frame}>{body}</View>;
}
