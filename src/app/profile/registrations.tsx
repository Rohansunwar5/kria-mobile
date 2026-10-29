import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getMyEntries, withdrawEntry } from '@/api/tournaments';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/Bars';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { entryRows, type EntryRow } from '@/lib/entriesView';

type Rows = ReturnType<typeof entryRows>;

function Row({ r, closed, onWithdraw, onOpen }: { r: EntryRow; closed?: boolean; onWithdraw: () => void; onOpen: () => void }) {
  return (
    <View style={s.row}>
      <Tap accessibilityLabel={r.name} onPress={onOpen} style={s.rowMain}>
        <View style={[s.circle, closed && { backgroundColor: colors.surface1 }]}>
          <Icon name={sportIcon(r.sport)} size={20} color={closed ? colors.text4 : colors.text3} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} style={[s.name, closed && { color: colors.text2 }]}>{r.name}</Text>
          {r.sub ? <Text style={s.sub}>{r.sub}</Text> : null}
          <Text style={[s.status, { color: colors[r.tone] }]}>{r.status}</Text>
          {r.money ? <Text style={s.money}>{r.money}</Text> : null}
        </View>
      </Tap>
      {r.canWithdraw ? (
        <Tap accessibilityLabel={`Withdraw entry in ${r.name}`} onPress={onWithdraw} style={s.withdraw}>
          <Text style={s.withdrawText}>Withdraw</Text>
        </Tap>
      ) : null}
    </View>
  );
}

export default function MyEntries() {
  const router = useRouter();
  const [rows, setRows] = useState<Rows | null>(null);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState<EntryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inFlight = useRef(false);
  const alive = useRef(true);
  const latest = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    setFailed(false);
    try {
      // One request: the server sends each entry's tournament, category and
      // payment with it (SERVER-GAPS #31).
      const entries = await getMyEntries();
      if (!alive.current || mine !== latest.current) return;
      setRows(entryRows(entries));
    } catch {
      if (alive.current && mine === latest.current) setFailed(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const withdraw = async () => {
    if (!target || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErr('');
    try {
      await withdrawEntry(target.id);
      if (!alive.current) return;
      setTarget(null);
      load();
    } catch (e) {
      if (alive.current) setErr((e as Error).message || "Couldn't withdraw. Try again.");
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const open = (r: EntryRow) => router.push({ pathname: '/category/[categoryId]', params: { categoryId: r.categoryId, tournamentId: r.tournamentId } });
  const ask = (r: EntryRow) => { setErr(''); setTarget(r); };
  const count = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
  const empty = rows && !rows.active.length && !rows.closed.length;

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="My entries" onBack={() => goBack(router, '/(tabs)/profile')} />
      <ScrollView contentContainerStyle={s.body}>
        {failed ? <InlineError what="Couldn't load your entries." onRetry={load} /> : null}
        {!rows && !failed ? (
          <View style={{ gap: 14 }}>
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
          </View>
        ) : null}
        {empty ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name="receipt_long" size={30} color={colors.text4} /></View>
            <Text style={[display(26), { textAlign: 'center' }]}>No entries yet</Text>
            <Text style={s.emptyLine}>Enter a tournament category and it shows here.</Text>
            <Button variant="secondary" label="Find an event" onPress={() => router.push('/(tabs)/events')} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
          </View>
        ) : null}
        {rows && rows.active.length ? (
          <View>
            <SectionHeader title="Active" meta={count(rows.active.length)} />
            <View style={s.list}>{rows.active.map((r) => <Row key={r.id} r={r} onOpen={() => open(r)} onWithdraw={() => ask(r)} />)}</View>
          </View>
        ) : null}
        {rows && rows.closed.length ? (
          <View>
            <SectionHeader title="Closed" meta={count(rows.closed.length)} />
            <View style={s.list}>{rows.closed.map((r) => <Row key={r.id} r={r} closed onOpen={() => open(r)} onWithdraw={() => {}} />)}</View>
          </View>
        ) : null}
      </ScrollView>
      <BottomSheet open={!!target} onClose={() => { if (!busy) setTarget(null); }} title={target ? `Withdraw from ${target.name}?` : undefined}>
        <Text style={s.sheetLine}>The organiser sees that you withdrew. You can't enter this category again.</Text>
        {err ? <Text style={s.sheetErr}>{err}</Text> : null}
        <View style={{ gap: 10, marginTop: 20 }}>
          <Button label="Withdraw" busyLabel="Withdrawing" busy={busy} onPress={withdraw} />
          <Button variant="secondary" label="Keep my entry" disabled={busy} onPress={() => setTarget(null)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: 32, gap: space.sectionGap },
  list: { marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  status: { fontFamily: font.semibold, fontSize: 12 },
  money: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
  withdraw: { height: 36, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  withdrawText: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  empty: { paddingTop: 48, paddingHorizontal: 12, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
  sheetLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text2 },
  sheetErr: { marginTop: 12, fontFamily: font.regular, fontSize: 13, color: colors.error },
});
