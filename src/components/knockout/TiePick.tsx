import { Alert, View, Text, Pressable } from 'react-native';
import type { QuickMatch } from '@/api/quickMatch';
import { useTheme } from '@/lib/theme';

/**
 * A tied knockout match still needs a team to go through. The teams settle it
 * on the ground — super over, bowl-out, toss — and the host records who won
 * it. The match itself stays a tie in everyone's record.
 */
export function TiePick({ match, isHost, busy, onPick }: {
  match: QuickMatch;
  isHost: boolean;
  busy: boolean;
  onPick: (sideId: string) => void;
}) {
  const t = useTheme();
  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.brandInk };
  const body = { fontFamily: 'SpaceGrotesk_400Regular' as const, fontSize: 13, lineHeight: 19, color: t.textMeta };

  if (!isHost) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={body}>Tied — waiting for the host to pick who goes through</Text>
      </View>
    );
  }

  const confirm = (side: QuickMatch['sides'][number]) =>
    Alert.alert(`${side.name} go through?`, 'Settle it on the ground first: super over, bowl-out or toss. This cannot be changed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: `${side.name} go through`, onPress: () => onPick(side.sideId) },
    ]);

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
      <Text style={label}>Tied — who goes through?</Text>
      <Text style={body}>Settle it on the ground, then tap the team that won it.</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {match.sides.map((side) => (
          <Pressable
            key={side.sideId}
            accessibilityRole="button"
            accessibilityLabel={`${side.name} goes through`}
            disabled={busy}
            onPress={() => confirm(side)}
            style={{ flex: 1, minHeight: 48, borderRadius: 5, borderWidth: 1.5, borderColor: t.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, opacity: busy ? 0.5 : 1 }}
          >
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase', color: t.text }}>{side.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
