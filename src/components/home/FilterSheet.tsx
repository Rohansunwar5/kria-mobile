import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Btn, Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';
import { colors } from '@/lib/theme';
import { CITIES, SPORTS } from '@/lib/tournamentConstants';
import { EMPTY_FILTERS, STAGES, type Filters } from '@/lib/tournamentFilters';

// tournamentFilters.ts keeps its own titleCase private, and a lookup map here
// would need a new entry every time a sport plugin lands — the same reason
// that module split on `_` instead of one. Duplicated rather than exported so
// this sheet stays inside the interface Task 2 actually published.
function titleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const TONE_COLOR: Record<'open' | 'live' | 'auction' | 'ended', string> = {
  open: colors.open,
  live: colors.brand,
  auction: colors.auction,
  ended: 'rgba(255,255,255,0.28)',
};

function SportTile({
  label,
  iconName,
  selected,
  onPress,
}: {
  label: string;
  iconName: 'shuttlecock' | 'cricket-bat';
  selected: boolean;
  onPress: () => void;
}) {
  const contentColor = selected ? colors.ink : '#bdbdbd';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        minHeight: 62,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 13,
        backgroundColor: selected ? colors.brand : 'transparent',
        ...(selected ? null : { borderWidth: 1.5, borderColor: colors.line }),
      }}
    >
      <Icon name={iconName} size={20} color={contentColor} />
      <Text
        style={{
          fontFamily: 'Anton_400Regular',
          textTransform: 'uppercase',
          fontSize: 16,
          color: selected ? colors.ink : colors.white,
        }}
      >
        {label}
      </Text>
      {selected ? (
        <>
          <View style={{ flex: 1 }} />
          <Icon name="check" size={15} color={colors.ink} strokeWidth={2.8} />
        </>
      ) : null}
    </Pressable>
  );
}

function CityChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 3,
        paddingHorizontal: 13,
        paddingVertical: 9,
        backgroundColor: selected ? colors.brand : 'transparent',
        ...(selected ? null : { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)' }),
      }}
    >
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 10,
          letterSpacing: 0.1 * 10,
          textTransform: 'uppercase',
          color: selected ? colors.ink : '#bdbdbd',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StageSwatch({
  label,
  toneColor,
  selected,
  onPress,
}: {
  label: string;
  toneColor: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={{
        flex: 1,
        minHeight: 46,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderColor: selected ? colors.brand : 'rgba(255,255,255,0.16)',
        backgroundColor: selected ? 'rgba(249,115,22,0.12)' : 'transparent',
      }}
    >
      {/* 9px square, not a dot — DESIGN.md §3. Colour says which stage; the
          check (below) says selected, so colour is never the only signal. */}
      <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: toneColor }} />
      <Text
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 11,
          letterSpacing: 0.1 * 11,
          textTransform: 'uppercase',
          color: colors.white,
        }}
      >
        {label}
      </Text>
      {selected ? (
        <>
          <View style={{ flex: 1 }} />
          <Icon name="check" size={14} color={colors.brand} strokeWidth={2.8} />
        </>
      ) : null}
    </Pressable>
  );
}

/**
 * The tournament list's filter sheet: sport, city and stage — the only three
 * fields the list endpoint accepts.
 *
 * Everything in here edits a local DRAFT, not `filters` itself. Tapping a
 * chip only ever changes this sheet; the screen behind it is untouched until
 * `onApply` fires from the footer button, and `onClose` (backdrop, hardware
 * back, or a future close affordance) discards the draft outright. Reopening
 * must start from what is actually applied, not a discarded edit, so the
 * draft is re-seeded from `filters` whenever `visible` turns true — and
 * deliberately only then: `filters` is read inside the effect but left out
 * of its dependency list on purpose, so an in-progress edit survives an
 * unrelated re-render (e.g. a live result-count refresh) while the sheet
 * stays open.
 */
export function FilterSheet({
  visible,
  filters,
  resultCount,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  resultCount: number;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggle(key: keyof Filters, value: string) {
    setDraft((prev) => ({ ...prev, [key]: prev[key] === value ? EMPTY_FILTERS[key] : value }));
  }

  function resetDraft() {
    setDraft(EMPTY_FILTERS);
  }

  const applyLabel = `Show ${resultCount} event${resultCount === 1 ? '' : 's'}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          // rgb(11,11,11) is colors.ink; the dim is that colour at 72% alpha.
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,11,11,0.72)' }}
        />

        <View
          style={{
            maxHeight: '90%',
            backgroundColor: colors.panel,
            borderTopWidth: 1.5,
            borderTopColor: colors.line,
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 9 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)' }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 14 }}>
            {/* fontSize 26 needs lineHeight >= 31 to clear the Anton floor
                (1.188 * 26 = 30.9); the artboard's own 24 predates that fix. */}
            <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 26, lineHeight: 31, color: colors.white }}>
              Filter
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={resetDraft} accessibilityRole="button" accessibilityLabel="Clear all filters" hitSlop={8}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.14 * 10, textTransform: 'uppercase', color: '#7d7d7d' }}>
                Clear all
              </Text>
            </Pressable>
          </View>
          <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Lbl style={{ letterSpacing: 0.16 * 9, marginBottom: 9 }}>Sport</Lbl>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                {SPORTS.slice(1).map((sport) => (
                  <SportTile
                    key={sport}
                    label={titleCase(sport)}
                    iconName={sport === 'badminton' ? 'shuttlecock' : 'cricket-bat'}
                    selected={draft.sport === sport}
                    onPress={() => toggle('sport', sport)}
                  />
                ))}
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <Lbl style={{ letterSpacing: 0.16 * 9, marginBottom: 9 }}>City</Lbl>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {CITIES.slice(1).map((city) => (
                  <CityChip key={city} label={city} selected={draft.city === city} onPress={() => toggle('city', city)} />
                ))}
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <Lbl style={{ letterSpacing: 0.16 * 9, marginBottom: 9 }}>Stage</Lbl>
              <View style={{ gap: 9 }}>
                {[STAGES.slice(0, 2), STAGES.slice(2, 4)].map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 9 }}>
                    {row.map((stage) => (
                      <StageSwatch
                        key={stage.value}
                        label={stage.label}
                        toneColor={TONE_COLOR[stage.tone]}
                        selected={draft.status === stage.value}
                        onPress={() => toggle('status', stage.value)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 9,
              paddingHorizontal: 16,
              paddingTop: 20,
              paddingBottom: 26,
              marginTop: 6,
              borderTopWidth: 1.5,
              borderTopColor: 'rgba(255,255,255,0.10)',
            }}
          >
            <Btn label="Reset" onPress={resetDraft} variant="ghost" style={{ width: 104 }} />
            <Btn label={applyLabel} onPress={() => onApply(draft)} arrow style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
