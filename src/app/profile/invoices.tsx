import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getMyPayments, type Invoice } from '@/api/payment';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/Bars';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { sportName } from '@/lib/homeView';
import { formatShortDate, rupees } from '@/lib/format';
import { feeLines, paidAt, paymentLook, paymentsSummary, sortPayments } from '@/lib/paymentsView';

const joinDot = (...p: (string | undefined)[]) => p.filter(Boolean).join(' · ');
const paidStamp = (inv: Invoice) =>
  new Date(paidAt(inv)).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

const TONE = {
  paid: colors.accent,
  open: colors.text3,
  failed: colors.loss,
  refunded: colors.text3,
} as const;

function StatusPill({ inv }: { inv: Invoice }) {
  const look = paymentLook(inv);
  if (look.tone === 'paid') return null;
  return (
    <View style={s.pill}>
      <Text style={[s.pillText, { color: TONE[look.tone] }]}>{look.label}</Text>
    </View>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <View style={s.idRow}>
      <Text style={s.idLabel}>{label}</Text>
      <View style={s.idValue}>
        <Text selectable style={s.mono}>{value}</Text>
        <Tap accessibilityLabel={copied ? 'Copied' : `Copy ${label.toLowerCase()} id`} onPress={() => Clipboard.setStringAsync(value).then(() => setCopied(true), () => undefined)} style={s.copy}>
          <Icon name={copied ? 'check' : 'content_copy'} size={18} color={colors.text3} />
        </Tap>
      </View>
    </View>
  );
}

export default function Payments() {
  const router = useRouter();
  const [list, setList] = useState<Invoice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<Invoice | null>(null);
  const alive = useRef(true);
  const latest = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    setFailed(false);
    try {
      const rows = await getMyPayments();
      if (alive.current && mine === latest.current) setList(sortPayments(rows));
    } catch {
      if (alive.current && mine === latest.current) setFailed(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sum = useMemo(() => paymentsSummary(list ?? []), [list]);

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Payments" onBack={() => goBack(router, '/(tabs)/profile')} />
      <ScrollView contentContainerStyle={s.body}>
        {failed ? <InlineError what="Couldn't load your payments." onRetry={load} /> : null}
        {!list && !failed ? (
          <View style={{ gap: 14 }}>
            <Skeleton style={{ height: 60 }} />
            <Skeleton style={{ height: 60 }} />
          </View>
        ) : null}
        {list && list.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Icon name="receipt_long" size={30} color={colors.text4} /></View>
            <Text style={[display(26), { textAlign: 'center' }]}>No payments yet</Text>
            <Text style={s.emptyLine}>Entry fees you pay show up here.</Text>
            <Button variant="secondary" label="Find an event" onPress={() => router.push('/(tabs)/events')} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
          </View>
        ) : null}
        {list && list.length ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={s.cap}>Total paid</Text>
              <Text style={display(56)}>{rupees(sum.total)}</Text>
              <Text style={s.sub}>{`${sum.count} ${sum.count === 1 ? 'entry fee' : 'entry fees'}`}</Text>
            </View>
            <View>
              <SectionHeader title="Entry fees" />
              <View style={{ marginTop: 6 }}>
                {list.map((inv) => (
                  <Tap key={inv._id} accessibilityLabel={inv.tournament?.name ?? 'Tournament'} onPress={() => setSel(inv)} style={s.row}>
                    <View style={s.circle}><Icon name="receipt_long" size={20} color={colors.text3} /></View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Text numberOfLines={1} style={s.name}>{inv.tournament?.name ?? 'Tournament'}</Text>
                      <Text style={s.sub}>{joinDot(inv.category?.name, formatShortDate(paidAt(inv)))}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={s.amount}>{rupees(inv.amount)}</Text>
                      <StatusPill inv={inv} />
                    </View>
                    <Icon name="chevron_right" size={20} color={colors.text4} />
                  </Tap>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
      <BottomSheet open={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <View style={s.paidRow}>
                <Icon
                  name={paymentLook(sel).tone === 'paid' ? 'check_circle' : 'info'}
                  variant="f"
                  size={16}
                  color={TONE[paymentLook(sel).tone]}
                />
                <Text style={s.paid}>{`${paymentLook(sel).label} · ${paidStamp(sel)}`}</Text>
              </View>
              <Text style={display(30)}>{sel.tournament?.name ?? 'Tournament'}</Text>
              <Text style={s.sub}>{joinDot(sel.category?.name, sportName(sel.tournament?.sport ?? ''))}</Text>
            </View>
            <View>
              {feeLines(sel).map((l) => (
                <View key={l.label} style={[s.fee, l.total && s.feeTotal]}>
                  <Text style={[s.feeLabel, l.total && s.feeTotalText]}>{l.label}</Text>
                  <Text style={[s.feeValue, l.total && s.feeTotalText]}>{l.value}</Text>
                </View>
              ))}
            </View>
            <View>
              {sel.razorpayOrderId ? <IdRow label="Order" value={sel.razorpayOrderId} /> : null}
              {sel.razorpayPaymentId ? <IdRow label="Payment" value={sel.razorpayPaymentId} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                variant="secondary"
                icon="mail"
                label="Get help"
                style={{ flex: 1 }}
                onPress={() => { Linking.openURL(`mailto:support@kria.club?subject=${encodeURIComponent(`Payment ${sel.razorpayOrderId ?? sel._id}`)}`).catch(() => undefined); }}
              />
              {/* Retry reopens the entry screen, which owns the whole pay flow
                  (quote, Razorpay, verify) — nothing is duplicated here. */}
              {paymentLook(sel).retry && sel.categoryId && sel.tournamentId ? (
                <Button
                  label="Try again"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const { categoryId, tournamentId } = sel;
                    setSel(null);
                    router.push({ pathname: '/category/[categoryId]', params: { categoryId: categoryId!, tournamentId: tournamentId! } });
                  }}
                />
              ) : (
                <Button label="Done" style={{ flex: 1 }} onPress={() => setSel(null)} />
              )}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: 32, gap: space.sectionGap },
  cap: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  circle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  amount: { fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.surface2 },
  pillText: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.2 },
  empty: { paddingTop: 48, paddingHorizontal: 12, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paid: { fontFamily: font.semibold, fontSize: 12, color: colors.text2 },
  fee: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line },
  feeTotal: { paddingVertical: 12 },
  feeLabel: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  feeValue: { fontFamily: font.regular, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
  feeTotalText: { fontFamily: font.bold, fontSize: 15, color: colors.text },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line },
  idLabel: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  idValue: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  mono: { fontFamily: font.mono, fontSize: 12, color: colors.text, flexShrink: 1 },
  copy: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
