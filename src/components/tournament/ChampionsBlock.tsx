import { View, Text } from 'react-native';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Icon } from '@/components/icons';
import { Ghost } from '@/components/states';
import type { FinalResult } from '@/lib/bracketView';
import { useTheme } from '@/lib/theme';

// ponytail: champion gold is not one of the palette's accents yet; it stays a
// literal here until a derived `gold` token earns a place in palette.ts.
const GOLD = '#FFC53D';
const GOLD_LINE = 'rgba(255,197,61,0.45)';

export interface Champion {
  categoryId: string;
  categoryName: string;
  result: FinalResult;
}

/**
 * Who won each category, and who they beat in the final. The caller passes
 * only decided categories, so this never renders an empty "Champion" heading
 * over a tournament still in its group stage.
 */
export function ChampionsBlock({ champions }: { champions: Champion[] }) {
  const theme = useTheme();
  if (champions.length === 0) return null;

  return (
    <View style={{ gap: 9 }}>
      {champions.map(({ categoryId, categoryName, result }) => (
        <View
          key={categoryId}
          style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: GOLD_LINE, borderRadius: 6, overflow: 'hidden' }}
        >
          <Ghost text="1" size={150} color="rgba(255,197,61,0.07)" style={{ right: -10, top: -14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <InitialsAvatar name={result.winner.name} logo={result.winner.logo} size={52} color={GOLD} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 24, lineHeight: 29, color: theme.text }}>
                {result.winner.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Icon name="trophy" size={11} color={GOLD} strokeWidth={2.2} />
                <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.12 * 9, textTransform: 'uppercase', color: GOLD }}>
                  {categoryName} champions
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1.5, borderTopColor: theme.lineFaint }}>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10, textTransform: 'uppercase', color: theme.textMeta }}>
              Final · beat <Text style={{ fontFamily: 'SpaceMono_700Bold', color: theme.text }}>{result.loser.name}</Text>
            </Text>
            {result.score || result.margin ? (
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: theme.text }}>{result.score ?? result.margin}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
