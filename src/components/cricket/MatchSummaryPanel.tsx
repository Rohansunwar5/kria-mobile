import { View, Text } from 'react-native';
import { CricketMatch, Scorecard, TeamBrand } from '@/api/cricketMatch';
import { matchSummary, strikeRate } from '@/lib/cricketView';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Hazard, Lbl } from '@/components/canvas';
import { Icon, type IconName } from '@/components/icons';

// Replaces the live-only panels once the match is over: the result, both
// innings side by side, and the three standout performances.

function Standout({ icon, label, name, team, figure, detail }: {
  icon: IconName;
  label: string;
  name: string;
  team?: string;
  figure: string;
  detail?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
      <Icon name={icon} size={18} color="#F97316" strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Lbl style={{ fontSize: 8, letterSpacing: 0.14 * 8 }}>{label}</Lbl>
        <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#fff', marginTop: 3 }}>
          {name}
        </Text>
        {team ? (
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.08 * 8, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
            {team}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: '#fff' }}>{figure}</Text>
        {detail ? (
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: '#a3a3a3', marginTop: 2 }}>{detail}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function MatchSummaryPanel({
  match,
  scorecard,
  brands,
}: {
  match: CricketMatch | null;
  scorecard: Scorecard | null;
  brands: Record<string, TeamBrand>;
}) {
  const summary = matchSummary(scorecard);
  if (!summary) return null;

  const { innings, topBat, topBowl, bestPartnership } = summary;
  const team1Id = String(match?.teams?.team1Id);
  const team2Id = String(match?.teams?.team2Id);
  const winnerName =
    String(match?.winnerId) === team1Id
      ? match?.teams?.team1Name
      : String(match?.winnerId) === team2Id
        ? match?.teams?.team2Name
        : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: '#16C46A', borderRadius: 6, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#16C46A' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#06240F' }}>
            Result
          </Text>
          <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, lineHeight: 21, color: '#06240F', marginTop: 5 }}>
            {winnerName ? `${winnerName} won` : 'Match complete'}
          </Text>
          {match?.result?.marginOfVictory ? (
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: 'rgba(6,36,15,0.75)', marginTop: 5 }}>
              {match.result.marginOfVictory}
            </Text>
          ) : null}
        </View>

        {innings.map((inn) => (
          <View
            key={inn.inningsNumber}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}
          >
            <InitialsAvatar
              name={inn.battingTeamName}
              size={28}
              color={brands[String(inn.battingTeamId)]?.primaryColor || '#3f3f46'}
            />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, color: '#fff' }}>
              {inn.battingTeamName}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 17, color: '#fff' }}>
              {inn.totals.runs}/{inn.totals.wickets}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#a3a3a3', width: 42, textAlign: 'right' }}>
              {inn.totals.overs} ov
            </Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <Lbl style={{ letterSpacing: 0.16 * 9 }}>Standout performances</Lbl>
        </View>
        <Hazard height={4} />
        {topBat ? (
          <Standout
            icon="cricket-bat"
            label="Top score"
            name={topBat.name}
            team={topBat.teamName}
            figure={`${topBat.runs} (${topBat.ballsFaced})`}
            detail={`SR ${topBat.strikeRate.toFixed(1)}`}
          />
        ) : null}
        {topBowl ? (
          <Standout
            icon="ball"
            label="Best bowling"
            name={topBowl.name}
            team={topBowl.teamName}
            figure={`${topBowl.wickets}/${topBowl.runs}`}
            detail={`${topBowl.overs} ov · econ ${topBowl.economy.toFixed(2)}`}
          />
        ) : null}
        {bestPartnership ? (
          <Standout
            icon="people"
            label="Biggest stand"
            name={`${bestPartnership.batter1Name} / ${bestPartnership.batter2Name}`}
            team={bestPartnership.teamName}
            figure={`${bestPartnership.runs} (${bestPartnership.balls})`}
            detail={`SR ${strikeRate(bestPartnership.runs, bestPartnership.balls).toFixed(1)}`}
          />
        ) : null}
      </View>
    </View>
  );
}
