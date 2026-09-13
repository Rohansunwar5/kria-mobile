import { Pressable, ScrollView, Text, View } from 'react-native';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';
import { colors, useTheme } from '@/lib/theme';
import { appliedChips, appliedCount, type Filters } from '@/lib/tournamentFilters';

const BAR = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 7,
  paddingHorizontal: 16,
  paddingTop: 14,
};

const CHIP_TEXT = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 10,
  letterSpacing: 0.1 * 10,
  textTransform: 'uppercase' as const,
  color: colors.white,
};

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

const FILTER_BTN = {
  minHeight: 44,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 7,
  paddingHorizontal: 12,
  borderRadius: 5,
  backgroundColor: colors.brand,
};

const COUNT_TEXT = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 11,
  letterSpacing: 0.1 * 11,
  color: colors.ink,
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
      <Text style={CHIP_TEXT}>{label}</Text>
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
 * The home screen's applied-filter strip: a chip per set filter plus the
 * button that opens `FilterSheet` for everything else — the sheet edits a
 * draft, so every actual change flows back through `onOpen` + the sheet's
 * `onApply`, except a single dismiss, which this bar can do on its own via
 * `onClear`.
 *
 * Chips are display + dismiss only, never a second way to edit a value —
 * that keeps this bar and the sheet from disagreeing about how a filter
 * gets set. With nothing applied there is nothing to scroll, so the left
 * side reads "All tournaments" (the same 9px overline `Lbl` uses everywhere
 * else) rather than sitting empty.
 */
export function FilterBar({
  filters,
  onClear,
  onOpen,
}: {
  filters: Filters;
  onClear: (key: keyof Filters) => void;
  onOpen: () => void;
}) {
  const chips = appliedChips(filters);
  const count = appliedCount(filters);
  const buttonLabel = count === 0 ? 'Filter tournaments' : `Filter tournaments, ${count} applied`;

  return (
    <View style={BAR}>
      <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {chips.length === 0 ? (
          <Lbl>All tournaments</Lbl>
        ) : (
          // This gap is one leg of the hitSlop/paddingRight/gap equality
          // explained on FilterChip's dismiss hitSlop above — load-bearing
          // together with those two, not just a spacing choice.
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            {chips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onDismiss={() => onClear(chip.key)} />
            ))}
          </ScrollView>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        onPress={onOpen}
        style={FILTER_BTN}
      >
        <Icon name="filter" size={14} color={colors.ink} strokeWidth={2.2} />
        {count > 0 ? <Text style={COUNT_TEXT}>{count}</Text> : null}
      </Pressable>
    </View>
  );
}
