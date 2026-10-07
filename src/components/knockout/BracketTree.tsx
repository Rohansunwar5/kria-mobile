import { ScrollView, View, Text, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import type { QuickKnockout } from '@/api/quickKnockout';
import { bracketColumns, entrantShortName, isPlayable } from '@/lib/quickKnockoutView';

const BOX_WIDTH = 132;

/**
 * The bracket, scrolled sideways (design option B). One column per round,
 * first names in each box. A fixture with a match opens its scoreboard;
 * a playable one (match, no winner) is outlined in brand orange.
 */
export function BracketTree({ knockout: k, onOpenMatch }: { knockout: QuickKnockout; onOpenMatch: (matchId: string) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 12 }}>
      {bracketColumns(k).map((col) => (
        <View key={col.name} style={{ width: BOX_WIDTH, gap: 10, justifyContent: 'space-around' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.textFaint }}>{col.name}</Text>
          {col.fixtures.map((f) => {
            const a = entrantShortName(k, f.entrantA) || '—';
            const b = f.bye ? 'Bye' : entrantShortName(k, f.entrantB) || '—';
            const line = (name: string, entrantId?: string) => (
              <Text numberOfLines={1} style={{
                fontFamily: f.winnerEntrantId && f.winnerEntrantId === entrantId ? 'SpaceGrotesk_700Bold' : 'SpaceGrotesk_500Medium',
                fontSize: 12,
                color: !entrantId ? t.textFaint : f.winnerEntrantId && f.winnerEntrantId !== entrantId ? t.textFaint : t.text,
              }}>{name}</Text>
            );
            const box = {
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: isPlayable(f) ? t.brand : t.line,
              backgroundColor: t.surface,
              padding: 7,
              gap: 2,
            };
            return f.quickMatchId ? (
              <Pressable key={f.fixtureId} accessibilityRole="button" accessibilityLabel={`Open ${a} v ${b}`} onPress={() => onOpenMatch(f.quickMatchId!)} style={box}>
                {line(a, f.entrantA)}
                {line(b, f.bye ? undefined : f.entrantB)}
              </Pressable>
            ) : (
              <View key={f.fixtureId} style={box}>
                {line(a, f.entrantA)}
                {line(b, f.bye ? undefined : f.entrantB)}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
