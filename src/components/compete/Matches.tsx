import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { listMyQuickKnockouts, resolveQuickCode, type QuickKnockout } from '@/api/quickKnockout';
import { listMyQuickMatches, QUICK_PAGE, type QuickMatch } from '@/api/quickMatch';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius, space } from '@/constants/theme';
import { CODE_LENGTH, knockoutCard, matchCard, normaliseCode, sortCards } from '@/lib/matchCard';
import { freeSlots } from '@/lib/quickMatchView';

type Filter = 'all' | QuickMatch['status'];
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const HOW: { icon: IconName; title: string; body: string }[] = [
  { icon: 'qr_code_2', title: 'The host creates a match', body: 'They name both sides and get a 6-character code to share.' },
  { icon: 'person_check', title: 'You claim your spot', body: 'Enter the code and pick your spot. Until a spot is claimed, it plays as a guest.' },
  { icon: 'trending_up', title: 'The result lands on your record', body: 'Every finished match counts toward your record, rankings and milestones.' },
];

/**
 * Compete › Matches (mock 1c, empty 4c). The API has no open-match feed — only
 * /mine and code lookup — so this is the code field plus your own history.
 * Matches page back through /mine; knockouts are still the newest 20.
 */
export function Matches({ meId }: { meId: string }) {
  const [matches, setMatches] = useState<QuickMatch[] | null>(null);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  // The server has no older matches past what is loaded.
  const [end, setEnd] = useState(false);
  const [more, setMore] = useState(false);

  const load = useCallback(async (status: Filter) => {
    setFailed(false);
    const [mine, kos] = await Promise.all([
      listMyQuickMatches(status === 'all' ? undefined : { status }).catch(() => null),
      listMyQuickKnockouts().catch(() => null),
    ]);
    if (mine) {
      setMatches(mine);
      setEnd(mine.length < QUICK_PAGE);
    } else setFailed(true);
    if (kos) setKnockouts(kos);
  }, []);
  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  // Cursor paging: the oldest row in hand is where the next page starts.
  const loadMore = async () => {
    const oldest = matches?.[matches.length - 1]?.createdAt;
    if (more || end || !oldest) return;
    setMore(true);
    try {
      const next = await listMyQuickMatches({ before: oldest, ...(filter === 'all' ? {} : { status: filter }) });
      setMatches((cur) => [...(cur ?? []), ...next]);
      if (next.length < QUICK_PAGE) setEnd(true);
    } catch {
      // Leave the button so it can be tried again.
    }
    setMore(false);
  };

  const cards = sortCards([
    ...(matches ?? []).map((m) => ({ ...matchCard(m, meId), createdAt: m.createdAt })),
    ...knockouts.map((k) => ({ ...knockoutCard(k), createdAt: k.createdAt })),
  ]);
  const none = matches !== null && cards.length === 0;
  const shown = cards.filter((c) => filter === 'all' || c.status === filter);

  return (
    <View>
      <JoinCard title={none ? 'Got a code from a friend?' : 'Join with a code'} />
      <View style={{ paddingTop: 14, paddingHorizontal: space.gutter }}>
        <Button variant={none ? 'secondary' : 'primary'} icon="add" label={none ? 'Host your own match' : 'Host a match'} onPress={() => router.push('/quick/new')} />
      </View>

      {failed ? <InlineError what="Couldn't load your matches." onRetry={() => load(filter)} /> : null}

      {matches === null && !failed ? (
        <View style={s.list}>
          <Skeleton style={{ height: 170, borderRadius: 22 }} />
          <Skeleton style={{ height: 170, borderRadius: 22 }} />
        </View>
      ) : none ? (
        <View style={s.empty}>
          <View style={{ gap: 6 }}>
            <Text style={display(26)}>No matches yet</Text>
            <Text style={s.emptyLine}>Matches you host or join show up here, live ones first. Here's how one works:</Text>
          </View>
          {HOW.map((h) => (
            <View key={h.icon} style={s.how}>
              <View style={s.howIcon}><Icon name={h.icon} size={20} /></View>
              <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
                <Text style={s.howTitle}>{h.title}</Text>
                <Text style={s.howBody}>{h.body}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : matches !== null ? (
        <>
          <View style={{ paddingTop: space.sectionGap, paddingHorizontal: space.gutter }}>
            <SectionHeader title="Your matches" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {FILTERS.map((f) => {
              const on = f.key === filter;
              return (
                <Pressable key={f.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setFilter(f.key)} style={[s.chip, { backgroundColor: on ? colors.text : colors.surface2 }]}>
                  <Text style={[s.chipText, { color: on ? colors.bg : colors.text }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={s.list}>
            {shown.map((c) => <MatchCard key={c.id} v={c} />)}
            {shown.length === 0 ? <Text style={s.nothing}>Nothing here. Matches you host or join will show up in this list.</Text> : null}
            {!end && matches.length ? (
              <Button variant="secondary" label="Load more" busyLabel="Loading more" busy={more} onPress={loadMore} />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

const serverMessage = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Looks the code up as soon as it's complete, so the hint says what Join will open. */
function JoinCard({ title }: { title: string }) {
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState<{ ok: boolean; text: string } | 'busy' | null>(null);

  useEffect(() => {
    if (code.length !== CODE_LENGTH) {
      setLookup(null);
      return;
    }
    let current = true;
    setLookup('busy');
    resolveQuickCode(code).then(
      (found) => {
        if (!current) return;
        if (found.kind === 'knockout') {
          const k = found.data;
          setLookup(k.status === 'waiting' ? { ok: true, text: `${k.name} · knockout · tap Join` } : { ok: false, text: `${k.name} has ${k.status === 'live' ? 'already started' : k.status === 'completed' ? 'finished' : 'been cancelled'}.` });
          return;
        }
        const m = found.data;
        const name = `${m.sides[0]?.name} vs ${m.sides[1]?.name}`;
        const open = freeSlots(m).length;
        if (m.status === 'completed' || m.status === 'cancelled') setLookup({ ok: false, text: `${name} has ${m.status === 'completed' ? 'finished' : 'been cancelled'}.` });
        else if (!open) setLookup({ ok: false, text: `${name} · every spot is taken` });
        else setLookup({ ok: true, text: `${name} · ${plural(open, 'open spot')} · tap Join` });
      },
      (err) => current && setLookup({ ok: false, text: serverMessage(err) ?? 'No match or knockout has this code.' }),
    );
    return () => {
      current = false;
    };
  }, [code]);

  const ready = code.length === CODE_LENGTH && !(lookup && lookup !== 'busy' && !lookup.ok);
  const hint =
    !code ? { text: 'Codes are 6 letters or numbers.', color: colors.text3 }
    : code.length < CODE_LENGTH ? { text: `${plural(CODE_LENGTH - code.length, 'more character')}`, color: colors.text3 }
    : lookup === 'busy' || !lookup ? { text: 'Looking up this code…', color: colors.text3 }
    : { text: lookup.text, color: lookup.ok ? colors.text : colors.error };

  return (
    <View style={s.joinCard}>
      <Text style={s.joinTitle}>{title}</Text>
      <View style={s.joinRow}>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(normaliseCode(t))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={CODE_LENGTH}
          placeholder="······"
          placeholderTextColor={colors.text4}
          accessibilityLabel="Join code"
          style={s.input}
        />
        <Tap
          disabled={!ready}
          accessibilityLabel="Join"
          accessibilityState={{ disabled: !ready }}
          onPress={() => router.push({ pathname: '/quick/join', params: { code } })}
          style={[s.join, { backgroundColor: ready ? colors.accent : colors.surface2 }]}
        >
          <Text style={[s.joinText, { color: ready ? colors.onAccent : colors.disabled }]}>Join</Text>
        </Tap>
      </View>
      <Text style={[s.hint, { color: hint.color }]}>{hint.text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  joinCard: { marginTop: 28, marginHorizontal: space.gutter, padding: 20, borderRadius: 22, backgroundColor: colors.surface1, gap: 14 },
  joinTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  joinRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, minWidth: 0, height: 52, paddingHorizontal: 16, borderRadius: radius.input, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.surface3, color: colors.text, fontFamily: font.mono, fontSize: 20, letterSpacing: 4.8,
  },
  join: { height: 52, paddingHorizontal: 20, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  joinText: { fontFamily: font.bold, fontSize: 15 },
  hint: { fontFamily: font.regular, fontSize: 12 },
  chips: { gap: 8, paddingTop: 18, paddingBottom: 4, paddingHorizontal: space.gutter },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  chipText: { fontFamily: font.semibold, fontSize: 13 },
  list: { paddingTop: 18, paddingHorizontal: space.gutter, paddingBottom: 28, gap: 16 },
  nothing: { paddingVertical: 36, textAlign: 'center', fontFamily: font.regular, fontSize: 14, color: colors.text3 },
  empty: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter, gap: 22 },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3 },
  how: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  howIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  howTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  howBody: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text3 },
});
