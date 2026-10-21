import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { searchPlayers, type PlayerHit } from '@/api/playerSearch';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { colors, font, radius } from '@/constants/theme';
import type { Spot } from '@/lib/hostMatch';
import { initials } from '@/lib/matchCard';
import { SPORT_LABELS } from '@/lib/sports';

/** Server search needs 3+ characters. */
const MIN_QUERY = 3;

/**
 * Fill one spot: find a Kria player (the result then counts on their record),
 * type a guest name (claimable later with the code), or leave it open.
 */
export function SpotSheet({ open, current = { name: '' }, taken, onPick, onClose, title = 'Fill this spot', subtitle = 'Find a Kria player so it counts on their record, or type a guest name.', guestSub = 'They can claim this spot later with the code', leaveOpen = true, first }: {
  open: boolean;
  current?: Spot;
  /** Player ids already in the match, so nobody is added twice. */
  taken: string[];
  onPick: (spot: Spot) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  guestSub?: string;
  /** The host flow can leave a spot open; a knockout only adds people. */
  leaveOpen?: boolean;
  /** An option above the search, e.g. "Add me" for a host who removed themselves. */
  first?: { title: string; sub: string; initials: string; onPress: () => void };
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<PlayerHit[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (open) setQ(current.playerId ? '' : current.name);
  }, [open, current.playerId, current.name]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN_QUERY) {
      setHits(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      searchPlayers(term).then(
        (found) => live && (setHits(found), setFailed(false)),
        () => live && (setHits([]), setFailed(true)),
      );
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const name = q.trim();
  const shown = (hits ?? []).filter((h) => !taken.includes(h._id)).slice(0, 6);

  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={s.search}>
        <Icon name="search" size={20} color={colors.text4} />
        <TextInput value={q} onChangeText={setQ} placeholder="Name" placeholderTextColor={colors.text4} autoCorrect={false} style={s.input} accessibilityLabel="Player or guest name" />
      </View>
      <View>
        {first ? <Option initials={first.initials} title={first.title} sub={first.sub} onPress={first.onPress} /> : null}
        {shown.map((h) => {
          const full = `${h.firstName} ${h.lastName}`.trim();
          return (
            <Option
              key={h._id}
              initials={initials(full)}
              title={full}
              sub={[h.sport && (SPORT_LABELS[h.sport] ?? h.sport), h.location].filter(Boolean).join(' · ') || 'Kria player'}
              onPress={() => onPick({ playerId: h._id, name: full })}
            />
          );
        })}
        {name.length >= MIN_QUERY && hits && !shown.length ? (
          <Text style={s.meta}>{failed ? "Couldn't search players right now." : 'No Kria player by that name.'}</Text>
        ) : null}
        {name ? <Option icon title={`Use "${name}" as a guest`} sub={guestSub} onPress={() => onPick({ name })} /> : null}
        {leaveOpen ? <Option icon open title="Leave it open" sub="Anyone with the code can claim it" onPress={() => onPick({ name: '' })} /> : null}
      </View>
    </BottomSheet>
  );
}

function Option({ title, sub, initials: ini, icon, open, onPress }: {
  title: string;
  sub: string;
  initials?: string;
  icon?: boolean;
  open?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.option}>
      <View style={[s.avatar, open ? s.openRing : { backgroundColor: colors.surface3 }]}>
        {icon ? null : <Text style={s.ini}>{ini}</Text>}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <Text style={s.meta} numberOfLines={1}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: radius.input, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.lineStrong },
  input: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.cardLine },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  openRing: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ring },
  ini: { fontFamily: font.semibold, fontSize: 11, color: colors.text },
  title: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
