import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { colors, font, radius, space } from '@/constants/theme';
import type { EventFacets } from '@/api/tournaments';
import { EVENT_SPORTS, EVENT_STATUSES, facetLine, NO_FILTERS, type EventFilters } from '@/lib/eventsList';
import { sportName } from '@/lib/homeView';

type Key = keyof EventFilters;
type Option = { value: string; label: string; count?: number };

/** Mock 1f: Sport · Status · City chips, each opening a sheet (DESIGN §5.10 chips), with "N events" under each option. */
export function Filters({ value, onChange, facets, saved = false, onSaved }: {
  value: EventFilters; onChange: (f: EventFilters) => void; facets: EventFacets | null;
  /** The Saved chip (SERVER-GAPS #15); absent when logged out. */
  saved?: boolean; onSaved?: (on: boolean) => void;
}) {
  const [open, setOpen] = useState<Key | null>(null);
  const SHEETS: Record<Key, { title: string; sub: string; any: string; options: Option[] }> = {
    sport: { title: 'Sport', sub: 'Tournaments organisers can run on Kria', any: 'All sports', options: EVENT_SPORTS.map((v) => ({ value: v, label: sportName(v), count: facets?.sports[v] })) },
    status: { title: 'Status', sub: 'Where the tournament is in its lifecycle', any: 'Any status', options: EVENT_STATUSES.map((o) => ({ ...o, count: facets?.statuses[o.value] })) },
    city: { title: 'City', sub: 'Based on the venue', any: 'Any city', options: (facets?.cities ?? []).map((c) => ({ value: c.city, label: c.city, count: c.count })) },
  };
  const label = (k: Key) => SHEETS[k].options.find((o) => o.value === value[k])?.label ?? value[k];
  const any = value.sport || value.status || value.city || saved;
  const sheet = open ? SHEETS[open] : null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {onSaved ? (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saved ? 'Saved: on' : 'Saved: off'} onPress={() => onSaved(!saved)} style={[s.chip, { paddingRight: 14, gap: 4, backgroundColor: saved ? colors.text : colors.surface2 }]}>
            <Icon name="bookmark" variant={saved ? 'f' : 'o'} size={16} color={saved ? colors.bg : colors.text} />
            <Text style={[s.chipText, { color: saved ? colors.bg : colors.text }]}>Saved</Text>
          </Pressable>
        ) : null}
        {(['sport', 'status', 'city'] as Key[]).map((k) => {
          const on = !!value[k];
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${SHEETS[k].title}: ${on ? label(k) : 'any'}`} onPress={() => setOpen(k)} style={[s.chip, { backgroundColor: on ? colors.text : colors.surface2 }]}>
              <Text style={[s.chipText, { color: on ? colors.bg : colors.text }]}>{on ? label(k) : SHEETS[k].title}</Text>
              <Icon name="expand_more" size={18} color={on ? colors.bg : colors.text} />
            </Pressable>
          );
        })}
        {any ? (
          <Pressable accessibilityRole="button" onPress={() => { onChange(NO_FILTERS); onSaved?.(false); }} style={s.clear}>
            <Text style={s.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <BottomSheet open={!!open} onClose={() => setOpen(null)} title={sheet?.title ?? ''} subtitle={sheet?.sub}>
        <ScrollView style={{ maxHeight: 380 }}>
          {sheet && open
            ? [{ value: '', label: sheet.any }, ...sheet.options].map((o) => {
                const on = value[open] === o.value;
                return (
                  <Pressable
                    key={o.value || 'any'}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      onChange({ ...value, [open]: o.value });
                      setOpen(null);
                    }}
                    style={s.option}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.optionText, { fontFamily: on ? font.bold : font.medium }]}>{o.label}</Text>
                      {o.value && facets ? <Text style={s.count}>{facetLine(o.count)}</Text> : null}
                    </View>
                    <View style={{ opacity: on ? 1 : 0 }}><Icon name="check" size={20} color={colors.accent} /></View>
                  </Pressable>
                );
              })
            : null}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  row: { gap: 8, paddingTop: 18, paddingHorizontal: space.gutter },
  chip: { height: 36, paddingLeft: 14, paddingRight: 8, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 2 },
  chipText: { fontFamily: font.semibold, fontSize: 13 },
  clear: { height: 36, paddingHorizontal: 10, justifyContent: 'center' },
  clearText: { fontFamily: font.semibold, fontSize: 13, color: colors.text3 },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.cardLine },
  optionText: { fontSize: 15, color: colors.text },
  count: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
