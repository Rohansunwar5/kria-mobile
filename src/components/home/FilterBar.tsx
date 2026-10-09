import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/icons';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme';

const CHIP_TEXT = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 10,
  letterSpacing: 0.1 * 10,
  textTransform: 'uppercase' as const,
  color: theme.text,
});

// The artboard draws the dismiss glyph at 9px, but a hit target that small
// fails DESIGN.md's 44px floor — a chip whose x cannot be hit is worse than
// no x. 20px box + 14px hitSlop on every side clears 44 with room to spare,
// the same trick IconBtn uses to stay visually small.
const CHIP_DISMISS = {
  width: 20,
  height: 20,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

function FilterChip({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  const theme = useTheme();
  // `.chip` from body-Main.html, overridden the same way the artboard's
  // applied-filter chips override it: filled neutral, no keyline (the base
  // class's inset box-shadow border is what `chip-on` and this both drop).
  const chip = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingLeft: 12,
    // Load-bearing alongside FilterChip's dismiss hitSlop and the chip row's
    // inter-chip `gap` below (see the comment on that hitSlop) — do not change
    // this on its own.
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 3,
    backgroundColor: theme.lineFaint,
  };
  return (
    <View style={chip}>
      <Text style={CHIP_TEXT(theme)}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Clear ${label} filter`}
        onPress={onDismiss}
        // hitSlop (14) minus chip.paddingRight (8) equals exactly the
        // inter-chip `gap` (6) on the ScrollView below — that exact equality
        // is why adjacent chips' extended tap zones touch edge-to-edge but
        // never overlap. It is unguarded: nothing enforces it in code, so
        // changing any ONE of these three numbers on its own either reopens
        // a dead gap between chips or makes their tap targets overlap.
        // (Unrelated: chip's own `gap: 6` above is the label-to-X spacing
        // inside a single chip, not this relationship — same number, but
        // that one is a coincidence, not a constraint.)
        hitSlop={14}
        style={CHIP_DISMISS}
      >
        <Icon name="close" size={9} color={theme.textFaint} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

/**
 * The Events tab's applied-filter chips. Display + dismiss only, never a
 * second way to edit a value — that keeps the chips and `FilterSheet` from
 * disagreeing about how a filter gets set. Renders nothing when no chip is set.
 */
export function FilterChips({ chips, onClear }: { chips: { key: string; label: string }[]; onClear: (key: string) => void }) {
  if (chips.length === 0) return null;
  return (
    // This gap is one leg of the hitSlop/paddingRight/gap equality explained
    // on FilterChip's dismiss hitSlop above — load-bearing together with
    // those two, not just a spacing choice.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      {chips.map((chip) => (
        <FilterChip key={chip.key} label={chip.label} onDismiss={() => onClear(chip.key)} />
      ))}
    </ScrollView>
  );
}

/** Opens `FilterSheet`. Carries the applied count, and keeps a 44px target. */
export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count === 0 ? 'Filter tournaments' : `Filter tournaments, ${count} applied`}
      onPress={onPress}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 11,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: theme.keyline,
      }}
    >
      <Icon name="filter" size={12} color={theme.textBody} strokeWidth={2.2} />
      <Text style={{ ...CHIP_TEXT(theme), color: theme.textBody }}>Filter</Text>
      {count > 0 ? (
        <View style={{ backgroundColor: theme.brand, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Text style={{ ...CHIP_TEXT(theme), color: theme.onBrand }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
