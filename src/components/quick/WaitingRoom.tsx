import { View, Text, Pressable, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { Tag, type TagVariant } from '@/components/StatusPill';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { QuickMatch } from '@/api/quickMatch';
import { formatLabel, isHost, statusVariant } from '@/lib/quickMatchView';

const label = (t: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.18 * 9,
  textTransform: 'uppercase' as const,
  color: t.textFaint,
});

const body = (t: Palette) => ({
  fontFamily: 'SpaceGrotesk_400Regular' as const,
  fontSize: 13,
  lineHeight: 19,
  color: t.textMeta,
});

const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase' as const };

/**
 * The host's Start button, pinned under the scroll by the screen so a long
 * cricket roster can never push it out of reach.
 */
export function StartBar({ busy, onStart }: { busy?: boolean; onStart: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg }}>
      <Text style={{ ...body(t), fontSize: 12, lineHeight: 17, marginBottom: 8 }}>
        Start whenever you’re ready — unclaimed names can still join after.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        disabled={busy}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: 5, backgroundColor: t.brand, opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ ...button, fontSize: 13, color: t.onBrand }}>Start match</Text>
        <Icon name="arrow-right" size={18} color={t.onBrand} />
      </Pressable>
    </View>
  );
}

/**
 * A match the host has created but not started. The host shares the code and
 * watches names get claimed; joined players wait here, and their screen turns
 * into the scoreboard the moment the host starts — both live, through
 * useQuickMatch's socket. The host's Start is `StartBar`, outside the scroll.
 *
 * Props-only, like MatchPanel, so it renders in a test with no router.
 */
export function WaitingRoom({
  match,
  playerId,
  busy,
  onCancel,
  onRemovePlayer,
}: {
  match: QuickMatch;
  playerId?: string;
  busy?: boolean;
  onCancel: () => void;
  onRemovePlayer: (playerId: string) => void;
}) {
  const t = useTheme();
  const host = isHost(match, playerId);
  const slots = match.sides.flatMap((side) => side.slots);
  const joined = slots.filter((slot) => slot.playerId).length;
  const hostName = slots.find((slot) => slot.playerId === match.hostId)?.displayName;
  const mine = playerId ? slots.find((slot) => slot.playerId === playerId) : undefined;
  const matchup = `${match.sides[0].name} v ${match.sides[1].name}`;
  const format = match.sport === 'cricket'
    ? `${match.matchConfig?.maxOvers ?? 20} overs · ${match.sides[0].slots.length} a side`
    : formatLabel(match);

  const share = () => {
    Share.share({
      message: `Join my quick match on Kria — ${matchup}. Open Kria, tap Join by code and enter ${match.joinCode}.`,
    }).catch(() => undefined);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Tag label={match.status} variant={statusVariant(match.status)} />
        <Text style={label(t)}>{format}</Text>
      </View>
      <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 12 }}>
        {matchup}
      </Text>

      {host ? (
        <>
          <View style={{ marginTop: 18, padding: 18, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
            <Text style={label(t)}>Match code</Text>
            <Text selectable style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 40, letterSpacing: 0.2 * 40, color: t.brandInk, marginTop: 6 }}>
              {match.joinCode}
            </Text>
            <Text style={{ ...body(t), marginTop: 6 }}>
              Players open Kria, tap Join by code, enter this and pick their name.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 14, borderRadius: 5, borderWidth: 1.5, borderColor: t.brand }}
            >
              <Icon name="share" size={16} color={t.brandInk} />
              <Text style={{ ...button, color: t.brandInk }}>Share code</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={{ marginTop: 18, padding: 18, borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="clock" size={18} color={t.openInk} />
            <Text style={{ flex: 1, fontFamily: 'Anton_400Regular', fontSize: 20, lineHeight: 24, textTransform: 'uppercase', color: t.text }}>
              {`Waiting for ${hostName ?? 'the host'} to start`}
            </Text>
          </View>
          <Text style={{ ...body(t), marginTop: 8 }}>
            {`${mine ? `You’re in as ${mine.displayName}. ` : ''}The score shows up here the moment the match begins.`}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <Text style={label(t)}>Players</Text>
        <Text style={{ ...label(t), color: t.openInk }}>{`${joined} of ${slots.length} joined`}</Text>
      </View>
      {match.sides.map((side) => (
        <View key={side.sideId} style={{ marginTop: 14 }}>
          <Text style={{ ...label(t), color: t.brandInk }}>{side.name}</Text>
          {side.slots.map((slot) => {
            const claimed = slot.playerId ? String(slot.playerId) : undefined;
            const [tag, variant]: [string, TagVariant] =
              claimed && claimed === playerId ? ['You', 'auction']
                : claimed === match.hostId ? ['Host', 'open']
                  : claimed ? ['Joined', 'open']
                    : ['Not joined', 'end'];
            return (
              <View key={slot.slotId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: 1.5, borderBottomColor: t.lineSoft }}>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14, color: claimed ? t.text : t.textMeta }}>
                  {slot.displayName}
                </Text>
                <Tag label={tag} variant={variant} />
                {host && claimed && claimed !== match.hostId ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${slot.displayName}`}
                    onPress={() => onRemovePlayer(claimed)}
                    disabled={busy}
                    hitSlop={8}
                    style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="close" size={16} color={t.textMeta} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {host ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          disabled={busy}
          style={{ alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 24, borderRadius: 5, borderWidth: 1.5, borderColor: t.fail }}
        >
          <Text style={{ ...button, color: t.failInk }}>Cancel match</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
