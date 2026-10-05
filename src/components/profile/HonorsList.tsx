import { View, Text, type ViewStyle } from 'react-native';
import { Badge } from '@/components/profile/Badge';
import { badgeFor, type Honor, type Tier } from '@/lib/badges';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

// The tier word in its tier's colour, through the ink tokens so it stays
// legible on light surfaces too (DESIGN.md §7). Steel has no accent.
const TIER_INK: Record<Tier, keyof Palette> = {
  legendary: 'auctionInk',
  elite: 'auctionInk',
  gold: 'brandInk',
  rare: 'openInk',
  steel: 'textMeta',
};

/**
 * The Honours section: organizer-granted honours (badge + title), newest
 * first, then legacy `titles` — the auto "Winner of …" strings, which carry no
 * badge and render with the champion art. Nothing at all when both are empty.
 */
export function HonorsList({
  label,
  honors,
  titles,
  style,
}: {
  label: string;
  honors?: Honor[];
  titles?: string[];
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const rows: Honor[] = [...(honors ?? [])]
    .reverse()
    .concat((titles ?? []).map((title) => ({ title, badge: '' })));
  if (!rows.length) return null;

  return (
    <View style={style}>
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: theme.textFaint, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ gap: 7 }}>
        {rows.map((h, i) => {
          const { tier } = badgeFor(h.badge);
          return (
            <View
              key={i}
              accessible
              accessibilityLabel={`${h.title}, ${tier} honour`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6 }}
            >
              <Badge badge={h.badge} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: theme[TIER_INK[tier]] }}>
                  {tier}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 15, lineHeight: 18, color: theme.text, marginTop: 2 }}>
                  {h.title}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
