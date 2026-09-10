import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { QuickCricketLineupEntry, QuickMatch } from '@/api/quickMatch';
import { lineupFromSlots, setupStage } from '@/lib/quickCricketView';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const HAIRLINE = 'rgba(255,255,255,0.12)';

function Btn({ label, onPress, disabled, accent }: {
  label: string; onPress?: () => void; disabled?: boolean; accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: accent ? '#F97316' : HAIRLINE,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: '#fff' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Toss, then batting order. Renders only while setup is incomplete; once
 * `setupStage` reads 'ready' the screen swaps in CricketScorePanel.
 *
 * Props-only. The one piece of local state is the half-made toss selection,
 * which has no meaning outside this panel.
 */
export function CricketSetupPanel({ match, playerId, busy, onToss, onLineup }: {
  match: QuickMatch;
  playerId?: string;
  busy: boolean;
  onToss: (input: { winnerSideId: string; decision: 'bat' | 'bowl' }) => void;
  onLineup: (input: { sideId: string; players: QuickCricketLineupEntry[] }) => void;
}) {
  const [tossWinner, setTossWinner] = useState<string | null>(null);
  const stage = setupStage(match);
  const isHost = Boolean(playerId) && playerId === match.hostId;

  if (!isHost) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={LBL}>Setting up</Text>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, color: '#fff', marginTop: 6 }}>
          Only the host can set this match up
        </Text>
      </View>
    );
  }

  if (stage === 'needs_toss') {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <Text style={LBL}>{tossWinner ? 'Toss — bat or bowl?' : 'Toss — who won it?'}</Text>

        {tossWinner ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn
              label="Bat"
              accent
              disabled={busy}
              onPress={busy ? undefined : () => onToss({ winnerSideId: tossWinner, decision: 'bat' })}
            />
            <Btn
              label="Bowl"
              accent
              disabled={busy}
              onPress={busy ? undefined : () => onToss({ winnerSideId: tossWinner, decision: 'bowl' })}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {match.sides.map((side) => (
              // Picking the toss winner is local state, not a mutation — it
              // is not gated by `busy`. Only the Bat/Bowl press below (which
              // actually calls `onToss`) is.
              <Btn key={side.sideId} label={side.name} onPress={() => setTossWinner(side.sideId)} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // stage === 'needs_lineups'
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 18 }}>
      <Text style={LBL}>Batting order</Text>
      {match.sides.map((side) => {
        const players = lineupFromSlots(side);
        return (
          <View key={side.sideId} style={{ borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12, gap: 8 }}>
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, color: '#fff' }}>
              {side.name}
            </Text>
            {players.map((p, i) => (
              <Text key={p.slotId} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff' }}>
                {`${i + 1}. ${p.name ? p.name : ''}${p.playerId ? '' : '  (guest)'}`}
              </Text>
            ))}
            <Btn
              label={`Confirm ${side.name}`}
              accent
              disabled={busy}
              onPress={busy ? undefined : () => onLineup({ sideId: side.sideId, players })}
            />
          </View>
        );
      })}
    </View>
  );
}
