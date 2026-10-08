import { useState } from 'react';
import { View, Text } from 'react-native';
import type { Scorecard } from '@/api/cricketMatch';
import type { QuickMatch } from '@/api/quickMatch';
import { Chip } from '@/components/canvas';
import { HeroScore } from '@/components/cricket/HeroScore';
import { AtTheCrease } from '@/components/cricket/AtTheCrease';
import { RecentOvers } from '@/components/cricket/RecentOvers';
import { ScorecardTabs } from '@/components/cricket/ScorecardTabs';
import { Innings1Panel, MatchStateBanner, PartnershipCard } from '@/components/cricket/LivePanels';
import { cricketOutcomeLabel, panelFor, tossLine } from '@/lib/quickCricketView';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });

type Section = 'live' | 'card';

/**
 * What everyone sees of a cricket quick match, host included: the toss and
 * squads while it is set up, then the tournament live screen's parts — score
 * band, at the crease, overs, and the scorecard. View only; the host's pad
 * sits under the screen's scroll.
 */
export function QuickCricketLive({ match, scorecard, playerId }: { match: QuickMatch; scorecard: Scorecard | null; playerId?: string }) {
  const t = useTheme();
  const [section, setSection] = useState<Section | null>(null);
  const toss = tossLine(match);

  if (match.status === 'live' && panelFor(match) === 'cricket-setup') {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: t.textBody }}>{toss ?? 'Waiting for the toss'}</Text>
        <Text style={label(t)}>Squads</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {match.sides.map((side) => (
            <View key={side.sideId} style={{ flex: 1, padding: 12, gap: 6, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
              <Text numberOfLines={1} style={{ fontFamily: 'Anton_400Regular', fontSize: 16, lineHeight: 20, textTransform: 'uppercase', color: t.text }}>{side.name}</Text>
              {side.slots.map((slot) => {
                const you = Boolean(playerId) && slot.playerId === playerId;
                return (
                  <Text key={slot.slotId} numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: you ? t.brandInk : t.textBody }}>
                    {you ? `${slot.displayName} (you)` : slot.displayName}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  const live = match.liveState ?? null;
  const completed = match.status === 'completed';
  const currentInnings = (live?.currentInnings ?? 1) as 1 | 2;
  const innings = (currentInnings === 1 ? scorecard?.innings1 : scorecard?.innings2) ?? null;
  const hasCard = Boolean(scorecard?.innings1 || scorecard?.innings2);
  // A finished match opens on its scorecard; the live parts are history by then.
  const active: Section = hasCard ? (section ?? (completed ? 'card' : 'live')) : 'live';
  const [side1, side2] = match.sides;

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {toss ? <Text style={{ ...label(t), color: t.textMeta }}>{toss}</Text> : null}
      {match.status === 'cancelled' ? <Text style={{ ...label(t), color: t.failInk }}>Match cancelled</Text> : null}
      <HeroScore
        match={{ matchConfig: match.matchConfig, teams: { team1Name: side1.name, team2Name: side2.name } }}
        live={live}
        innings={innings}
        completed={completed}
        resultLabel={cricketOutcomeLabel(match) ?? undefined}
      />
      {match.status === 'live' ? <MatchStateBanner live={live} /> : null}
      {hasCard ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label="Live" selected={active === 'live'} onPress={() => setSection('live')} />
          <Chip label="Scorecard" selected={active === 'card'} onPress={() => setSection('card')} />
        </View>
      ) : null}
      {active === 'live' ? (
        <>
          <AtTheCrease live={live} innings={innings} />
          <PartnershipCard partnership={innings?.currentPartnership ?? null} />
          <Innings1Panel innings1={scorecard?.innings1 ?? null} live={live} />
          <RecentOvers innings={innings} />
        </>
      ) : (
        <ScorecardTabs innings1={scorecard?.innings1 ?? null} innings2={scorecard?.innings2 ?? null} currentInnings={currentInnings} live={live} />
      )}
    </View>
  );
}
