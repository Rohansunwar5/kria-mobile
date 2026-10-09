import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { Category } from '@/store/slices/registrationSlice';
import { StatusPill, Tag } from '@/components/StatusPill';
import { Icon, type IconName } from '@/components/icons';
import { categoryLinks, feeLabel } from '@/lib/tournamentDetail';
import type { AuctionState } from '@/lib/drawRoute';
import { useTheme } from '@/lib/theme';

const ICON: Record<string, IconName> = {
  Bracket: 'bracket',
  League: 'bracket',
  Standings: 'chart',
  Auction: 'gavel',
  'Auction live': 'gavel',
};

/**
 * One category, with every place it leads as a button along its foot — the
 * bracket or league table, standings, the auction — and, while entry is open,
 * the way in. Tapping the card itself opens the category.
 */
export function CategoryCard({
  category,
  tournamentId,
  auction,
  sport,
  entering,
  entered,
  onOpen,
}: {
  category: Category;
  tournamentId: string;
  auction?: AuctionState;
  sport?: string;
  /** Entry is open for this category. */
  entering: boolean;
  /** The viewer has already entered it. */
  entered: boolean;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const links = categoryLinks(category, tournamentId, auction, sport);
  const meta = [
    category.bracketType?.replace('_', ' '),
    feeLabel(category),
    category.maxRegistrations ? `${category.maxRegistrations} spots` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9.5, letterSpacing: 0.08 * 9.5, textTransform: 'uppercase' as const };

  return (
    <View style={{ backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.line, borderRadius: 6, overflow: 'hidden', marginBottom: 9 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={category.name}
        onPress={onOpen}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 11, minHeight: 44 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 19, lineHeight: 23, color: theme.text }}>
            {category.name}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9.5, letterSpacing: 0.06 * 9.5, textTransform: 'uppercase', color: theme.textMeta, marginTop: 4 }}>
            {meta}
          </Text>
        </View>
        {entered ? <Tag label="Entered" variant="auction" /> : <StatusPill status={category.status} />}
      </Pressable>

      {entering || links.length > 0 ? (
        <View style={{ flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: theme.lineFaint }}>
          {entering ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={entered ? `${category.name}, you're in` : `Enter ${category.name}, ${feeLabel(category)}`}
              onPress={onOpen}
              style={{ flex: entered ? 1 : 1.4, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, ...(entered ? null : { backgroundColor: theme.brand }) }}
            >
              {entered ? <Icon name="check" size={12} color={theme.openInk} strokeWidth={2.4} /> : null}
              <Text style={{ ...label, color: entered ? theme.openInk : theme.onBrand }}>
                {entered ? "You're in" : `Enter · ${feeLabel(category)}`}
              </Text>
              {entered ? null : <Icon name="arrow-right" size={12} color={theme.onBrand} strokeWidth={2.4} />}
            </Pressable>
          ) : null}
          {links.map((l, i) => (
            <Pressable
              key={l.href + l.label}
              accessibilityRole="button"
              accessibilityLabel={`${category.name} ${l.label.toLowerCase()}`}
              onPress={() => router.push(l.href as never)}
              style={{
                flex: 1,
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                ...(entering || i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineFaint } : null),
              }}
            >
              <Icon name={ICON[l.label] ?? 'chevron-right'} size={12} color={l.live ? theme.auctionInk : theme.brandInk} />
              <Text style={{ ...label, color: l.live ? theme.auctionInk : theme.textBody }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
