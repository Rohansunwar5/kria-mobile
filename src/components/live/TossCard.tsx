import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { QuickCricketLineupEntry, QuickMatch } from '@/api/quickMatch';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius } from '@/constants/theme';
import { lineupFromSlots, setupStage } from '@/lib/quickCricketView';

/**
 * The host's toss, before the first ball (pad preview "Toss"). Recording it
 * fills both squads on the server, so play goes straight to the opening
 * batters. "Confirm teams" is only for a match whose toss an older app
 * recorded, which has no squads yet. Picking the winner is local, so only Bat,
 * Bowl and Confirm wait for `busy`. The room decides who sees this.
 */
export function TossCard({ match, busy, onToss, onLineup }: {
  match: QuickMatch;
  busy: boolean;
  onToss: (input: { winnerSideId: string; decision: 'bat' | 'bowl' }) => void;
  onLineup: (input: { sideId: string; players: QuickCricketLineupEntry[] }) => Promise<unknown> | void;
}) {
  const [winnerId, setWinnerId] = useState<string | null>(null);

  if (setupStage(match) !== 'needs_toss') {
    // One side at a time: two saves in flight together could each write over the other.
    const confirm = async () => {
      const lineups = [match.cricketSetup?.side1Lineup ?? [], match.cricketSetup?.side2Lineup ?? []];
      for (let i = 0; i < match.sides.length; i++) {
        if (lineups[i].length === 0) await onLineup({ sideId: match.sides[i].sideId, players: lineupFromSlots(match.sides[i]) });
      }
    };
    return <Button label="Confirm teams" busy={busy} onPress={() => { confirm(); }} />;
  }

  const winner = match.sides.find((side) => side.sideId === winnerId);
  return (
    <View style={s.root}>
      <View style={s.block}>
        <Text style={s.h}>Who won the toss?</Text>
        <View style={s.row}>
          {match.sides.map((side) => {
            const on = side.sideId === winnerId;
            const n = side.slots.length;
            return (
              <Tap
                key={side.sideId}
                accessibilityLabel={side.name}
                accessibilityState={{ selected: on }}
                onPress={() => setWinnerId(side.sideId)}
                style={[s.tile, { backgroundColor: on ? colors.text : colors.surface2 }]}
              >
                <Text numberOfLines={2} style={[s.side, { color: on ? colors.bg : colors.text }]}>{side.name}</Text>
                <Text style={[s.count, { color: on ? colors.ring : colors.text3 }]}>{`${n} player${n === 1 ? '' : 's'}`}</Text>
              </Tap>
            );
          })}
        </View>
      </View>
      {winner ? (
        <View style={s.block}>
          <Text style={s.h}>{`${winner.name} chose to`}</Text>
          <View style={s.row}>
            {(['bat', 'bowl'] as const).map((decision) => (
              <Tap
                key={decision}
                accessibilityLabel={decision === 'bat' ? 'Bat' : 'Bowl'}
                disabled={busy}
                onPress={() => onToss({ winnerSideId: winner.sideId, decision })}
                style={[s.choice, busy && { opacity: 0.5 }]}
              >
                <Icon name={decision === 'bat' ? 'sports_cricket' : 'sports_baseball'} size={20} />
                <Text style={s.choiceText}>{decision === 'bat' ? 'Bat' : 'Bowl'}</Text>
              </Tap>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 32 },
  block: { gap: 12 },
  h: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 16, borderRadius: 18, gap: 4 },
  side: { ...display(20), lineHeight: 21 },
  count: { fontFamily: font.regular, fontSize: 12 },
  choice: { flex: 1, height: 56, borderRadius: radius.button, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  choiceText: { fontFamily: font.bold, fontSize: 16, color: colors.text },
});
