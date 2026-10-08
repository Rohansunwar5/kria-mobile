import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { QuickCricketLineupEntry, QuickMatch } from '@/api/quickMatch';
import { lineupFromSlots, setupStage } from '@/lib/quickCricketView';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });
const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 14, letterSpacing: 0.14 * 14, textTransform: 'uppercase' as const };

/**
 * The host's setup: the toss. Recording it fills both squads on the server,
 * so play goes straight to the opening batters. "Confirm teams" is only for a
 * match whose toss an older app recorded, which has no squads yet. Watchers
 * get nothing here; their setup view is QuickCricketLive.
 *
 * Picking the toss winner is local state, not a request, so it is not gated by
 * `busy`; Bat and Bowl, which call `onToss`, are.
 */
export function CricketSetupPanel({ match, playerId, busy, onToss, onLineup }: {
  match: QuickMatch;
  playerId?: string;
  busy: boolean;
  onToss: (input: { winnerSideId: string; decision: 'bat' | 'bowl' }) => void;
  onLineup: (input: { sideId: string; players: QuickCricketLineupEntry[] }) => Promise<unknown> | void;
}) {
  const t = useTheme();
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const isHost = Boolean(playerId) && playerId === match.hostId;
  if (!isHost) return null;

  if (setupStage(match) === 'needs_toss') {
    const winner = match.sides.find((s) => s.sideId === tossWinner);
    return (
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <Text style={label(t)}>Toss — who won it?</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {match.sides.map((side) => {
            const on = side.sideId === tossWinner;
            return (
              <Pressable
                key={side.sideId}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setTossWinner(side.sideId)}
                style={{ flex: 1, minHeight: 96, padding: 14, gap: 8, justifyContent: 'space-between', borderRadius: 6, borderWidth: 1.5, borderColor: on ? t.brand : t.line, backgroundColor: on ? t.brandTint : t.surface }}
              >
                <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>{side.name}</Text>
                <Text style={label(t)}>{`${side.slots.length} players`}</Text>
              </Pressable>
            );
          })}
        </View>
        {winner ? (
          <>
            <Text style={label(t)}>{`${winner.name} chose to…`}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['bat', 'bowl'] as const).map((decision) => (
                <Pressable
                  key={decision}
                  accessibilityRole="button"
                  onPress={busy ? undefined : () => onToss({ winnerSideId: winner.sideId, decision })}
                  style={{ flex: 1, minHeight: 56, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
                >
                  <Text style={{ ...button, color: t.onBrand }}>{decision === 'bat' ? 'Bat' : 'Bowl'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </View>
    );
  }

  // One side at a time: two saves in flight together could each write over the other.
  const confirm = async () => {
    const lineups = [match.cricketSetup?.side1Lineup ?? [], match.cricketSetup?.side2Lineup ?? []];
    for (let i = 0; i < match.sides.length; i++) {
      if (lineups[i].length === 0) await onLineup({ sideId: match.sides[i].sideId, players: lineupFromSlots(match.sides[i]) });
    }
  };

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Pressable
        accessibilityRole="button"
        onPress={busy ? undefined : () => { confirm(); }}
        style={{ minHeight: 56, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ ...button, color: t.onBrand }}>Confirm teams</Text>
      </Pressable>
    </View>
  );
}
