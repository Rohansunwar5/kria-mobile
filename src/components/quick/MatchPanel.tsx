import { View, Text, Pressable } from 'react-native';
import { Tag } from '@/components/StatusPill';
import type { QuickMatch } from '@/api/quickMatch';
import {
  canUndo,
  currentGame,
  formatLabel,
  freeSlots,
  gamesWon,
  isHost,
  outcomeLabel,
  statusVariant,
} from '@/lib/quickMatchView';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const HAIRLINE = 'rgba(255,255,255,0.12)';

function SideColumn({ name, score, games }: { name: string; score: number; games: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: 16,
          color: '#fff',
        }}
      >
        {name}
      </Text>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 54, color: '#fff', marginTop: 4 }}>
        {String(score)}
      </Text>
      <Text style={LBL}>{`games ${games}`}</Text>
    </View>
  );
}

function Action({
  testID,
  label,
  onPress,
  disabled,
  tone = 'brand',
}: {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'brand' | 'quiet' | 'danger';
}) {
  const bg = tone === 'brand' ? '#F97316' : tone === 'danger' ? 'transparent' : 'rgba(255,255,255,0.08)';
  const fg = tone === 'danger' ? '#FF4438' : tone === 'brand' ? '#0B0B0B' : '#d4d4d4';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        opacity: disabled ? 0.4 : 1,
        backgroundColor: bg,
        borderRadius: 4,
        paddingVertical: 14,
        alignItems: 'center',
        ...(tone === 'danger' ? { borderWidth: 1.5, borderColor: '#FF4438' } : null),
      }}
    >
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 11,
          letterSpacing: 0.14 * 11,
          textTransform: 'uppercase',
          color: fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The body of a quick match: score, slots and — for the host only — the scoring
 * controls.
 *
 * Props-only and free of navigation, so it renders in a test without
 * `expo-router` mocks. The screen at `app/quick/[id].tsx` reads the params,
 * calls the hook and hands the result here.
 */
export function MatchPanel({
  match,
  playerId,
  onPoint,
  onUndo,
  onCancel,
  onRemovePlayer,
  busy,
}: {
  match: QuickMatch;
  playerId?: string;
  onPoint: (side: 1 | 2) => void;
  onUndo: () => void;
  onCancel: () => void;
  onRemovePlayer: (playerId: string) => void;
  busy?: boolean;
}) {
  const host = isHost(match, playerId);
  const game = currentGame(match);
  const won = gamesWon(match);
  const result = outcomeLabel(match);
  const open = freeSlots(match);

  // recordPoint and cancel both refuse anything but a live match. Undo is
  // different: it refuses only a CANCELLED match, because un-completing is
  // precisely what it exists to do.
  const canScore = host && match.status === 'live';
  const undoable = host && match.status !== 'cancelled' && canUndo(match);

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Tag label={match.status} variant={statusVariant(match.status)} dot={match.status === 'live'} />
        <Text style={LBL}>{formatLabel(match)}</Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 18, alignItems: 'flex-start' }}>
        <SideColumn name={match.sides[0].name} score={game ? game.side1Score : 0} games={won.side1} />
        <SideColumn name={match.sides[1].name} score={game ? game.side2Score : 0} games={won.side2} />
      </View>

      {result ? (
        <Text
          style={{
            fontFamily: 'Anton_400Regular',
            textTransform: 'uppercase',
            fontSize: 20,
            color: '#F97316',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          {result}
        </Text>
      ) : null}

      {canScore ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          <Action testID="point-side-1" label={`+1 ${match.sides[0].name}`} onPress={() => onPoint(1)} disabled={busy} />
          <Action testID="point-side-2" label={`+1 ${match.sides[1].name}`} onPress={() => onPoint(2)} disabled={busy} />
        </View>
      ) : null}

      {host ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Action testID="undo" label="Undo" onPress={onUndo} disabled={busy || !undoable} tone="quiet" />
          {match.status === 'live' ? (
            <Action testID="cancel" label="Cancel match" onPress={onCancel} disabled={busy} tone="danger" />
          ) : null}
        </View>
      ) : null}

      {host && match.status === 'live' && open.length > 0 ? (
        <View style={{ marginTop: 22, borderTopWidth: 1.5, borderTopColor: HAIRLINE, paddingTop: 14 }}>
          <Text style={LBL}>Share this code to fill the open slots</Text>
          <Text
            testID="join-code"
            style={{
              fontFamily: 'SpaceMono_700Bold',
              fontSize: 30,
              letterSpacing: 0.2 * 30,
              color: '#F97316',
              marginTop: 4,
            }}
          >
            {match.joinCode}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: 22, borderTopWidth: 1.5, borderTopColor: HAIRLINE }}>
        {match.sides.map((side) => (
          <View key={side.sideId} style={{ paddingTop: 14 }}>
            <Text style={LBL}>{side.name}</Text>
            {side.slots.map((slot) => (
              <View
                key={slot.slotId}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
              >
                <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: slot.playerId ? '#fff' : '#7d7d7d' }}>
                  {slot.playerId ? slot.displayName : `${slot.displayName} · open`}
                </Text>
                {host && match.status === 'live' && slot.playerId && String(slot.playerId) !== String(match.hostId) ? (
                  <Pressable
                    testID={`remove-${slot.playerId}`}
                    onPress={() => onRemovePlayer(String(slot.playerId))}
                    disabled={busy}
                  >
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.14 * 9, textTransform: 'uppercase', color: '#FF4438' }}>
                      Remove
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
