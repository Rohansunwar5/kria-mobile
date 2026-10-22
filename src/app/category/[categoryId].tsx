import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createPaymentOrder, type OrderDetails } from '@/api/payment';
import { getMyEntries, getTournamentTeams, registerEntry, type MyEntry, type SkillLevel } from '@/api/tournaments';
import { serverMessage } from '@/api/unwrap';
import { EntryForm } from '@/components/tournament/EntryForm';
import { EntryStatus } from '@/components/tournament/EntryStatus';
import { RazorpayWebView } from '@/components/tournament/RazorpayWebView';
import { FooterBar, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, font, space } from '@/constants/theme';
import { entryBlocker, entryProfile } from '@/lib/entryView';
import { feeBreakdown, rupees } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { confirmPending, loadPending, savePending, type PendingPayment } from '@/lib/pendingPayment';
import { isFree } from '@/lib/tournamentView';
import { useTournament } from '@/lib/useTournament';
import { useAppSelector } from '@/store/hooks';

// entryBlocker's answers that change the footer rather than sit under Pay.
const LOGIN = 'Log in to register';
const CLOSED = 'Entries are closed';
const NEEDS_PROFILE = 'Add your date of birth and gender to enter';

export default function CategoryScreen() {
  const { categoryId, tournamentId } = useLocalSearchParams<{ categoryId: string; tournamentId?: string }>();
  const router = useRouter();
  if (!tournamentId) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <TopBar title="" onBack={() => goBack(router)} />
        <Text style={s.lost}>Couldn't open this category</Text>
      </SafeAreaView>
    );
  }
  return <Category categoryId={categoryId} tournamentId={tournamentId} />;
}

function Category({ categoryId, tournamentId }: { categoryId: string; tournamentId: string }) {
  const router = useRouter();
  const user = useAppSelector((st) => st.auth.user);
  const { data, error, reload } = useTournament(tournamentId);
  const [skill, setSkill] = useState<SkillLevel | null>(null);
  // The open Razorpay order, with who pays and the skill picked when it was made.
  const [checkout, setCheckout] = useState<{ order: OrderDetails; playerId: string; skill: SkillLevel } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  // A paid Razorpay result the server hasn't confirmed as an entry. While it is
  // set, Pay is never offered: "Confirm my entry" re-sends it instead.
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [checked, setChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inFlight = useRef(false);
  const [failed, setFailed] = useState(false);
  // Only known right after paying on this screen; later opens show no amount.
  const [paidNow, setPaidNow] = useState<number>();
  const [entered, setEntered] = useState(false);
  const [fresh, setFresh] = useState<MyEntry[]>([]);
  const [entriesError, setEntriesError] = useState(false);
  const [teamName, setTeamName] = useState<string>();

  const back = () => goBack(router);
  const loadMine = async () => (await getMyEntries()).filter((e) => e.tournamentId === tournamentId);

  const showEntered = async () => {
    setEntered(true);
    setEntriesError(false);
    try {
      setFresh(await loadMine());
    } catch {
      setEntriesError(true);
    }
  };

  // One verify at a time: the retry on open and a tap must never overlap.
  const confirm = async (p: PendingPayment) => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    setConfirming(true);
    const result = await confirmPending(p, entryProfile(user, p.skillLevel, new Date()), loadMine).catch(() => 'failed' as const);
    inFlight.current = false;
    setConfirming(false);
    setFailed(result === 'failed');
    if (result === 'entered') {
      setPending(null);
      await showEntered();
    }
  };

  const userId = user?._id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadPending(userId, categoryId)
      .then((p) => {
        if (live && p) {
          setPending(p);
          confirm(p);
        }
      })
      .catch(() => {})
      .finally(() => live && setChecked(true));
    return () => { live = false; };
    // confirm reads the user of this render; it only needs to run per player and category.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, categoryId]);

  // Withdrawn counts: the server keeps that registration, so it refuses a new one.
  const myEntry = [...(data?.mine ?? []), ...fresh].find((e) => e.categoryId === categoryId);
  const teamId = myEntry?.teamId;
  useEffect(() => {
    if (!teamId) return;
    let live = true;
    getTournamentTeams(tournamentId).then((ts) => live && setTeamName(ts.find((t) => t._id === teamId)?.name), () => {});
    return () => { live = false; };
  }, [teamId, tournamentId]);

  const pay = async () => {
    if (!user || !skill) return;
    setBusy(true);
    setRefusal(null);
    try {
      setCheckout({ order: await createPaymentOrder(tournamentId, categoryId), playerId: user._id, skill });
    } catch (e) {
      setRefusal(serverMessage(e));
    }
    setBusy(false);
  };

  // The money is taken by now: nothing here may return early.
  const onPaid = async ({ order, playerId, skill: skillLevel }: NonNullable<typeof checkout>, paymentId: string, signature: string) => {
    const p: PendingPayment = { playerId, tournamentId, categoryId, orderId: order.orderId, paymentId, signature, amount: order.amount, skillLevel };
    setCheckout(null);
    setPending(p);
    setPaidNow(order.amount);
    // A store failure must not stop verify: the in-memory copy still blocks a second payment here.
    await savePending(p).catch(() => {});
    await confirm(p);
  };

  const register = async () => {
    if (!user || !skill) return;
    setBusy(true);
    setRefusal(null);
    try {
      await registerEntry({ tournamentId, categoryId, profile: entryProfile(user, skill, new Date()) });
    } catch (e) {
      setRefusal(serverMessage(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    await showEntered();
  };

  const c = data?.categories.find((x) => x._id === categoryId);
  const top = <TopBar title={c?.name ?? ''} sub={data?.tournament.name} onBack={back} />;

  if (!data || !c) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        {top}
        {data || error ? (
          <InlineError what={data ? "Couldn't find this category." : "Couldn't load this category."} onRetry={reload} />
        ) : (
          <View style={s.skeletons}>
            <Skeleton style={{ height: 120 }} />
            <Skeleton style={{ height: 180 }} />
            <Skeleton style={{ height: 76, borderRadius: 18 }} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const t = data.tournament;
  const hasTeams = (t.teamsCount ?? 0) > 0;
  const free = isFree(c);

  if (myEntry || entered) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        {top}
        {entriesError && !myEntry ? <InlineError what="Couldn't load your entry." onRetry={showEntered} /> : null}
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {myEntry ? (
            <EntryStatus entry={myEntry} hasTeams={hasTeams} paid={!free} teamName={teamName} paidAmount={paidNow} />
          ) : !entriesError ? (
            <Skeleton style={{ height: 200, marginTop: 44 }} />
          ) : null}
        </ScrollView>
        <FooterBar>
          {/* Back to 2a if it is under this screen, else replace this one with it (opened from Profile). */}
          <Button
            label="Back to tournament" variant="secondary" style={s.grow}
            onPress={() => router.dismissTo({ pathname: '/tournament/[id]', params: { id: tournamentId } })}
          />
        </FooterBar>
      </SafeAreaView>
    );
  }

  const now = new Date();
  const blocker = entryBlocker(c, t, user, now);
  const label = free ? 'Register' : `Pay ${rupees(feeBreakdown(c.registrationFee).total)} and register`;

  let footer: React.ReactNode;
  if (pending) {
    footer = <Button label="Confirm my entry" busy={confirming} busyLabel="Confirming" onPress={() => confirm(pending)} />;
  } else if (blocker === LOGIN) {
    footer = <Button label={LOGIN} onPress={() => router.push('/(auth)/login')} />;
  } else if (blocker === CLOSED) {
    footer = <Text style={s.closed}>{CLOSED}</Text>;
  } else {
    footer = (
      <>
        <Button
          label={label}
          busy={busy}
          busyLabel={free ? 'Registering' : 'Opening payment'}
          disabled={!!blocker || !skill || !checked}
          onPress={free ? register : pay}
        />
        {blocker && blocker !== NEEDS_PROFILE ? <Text style={s.reason}>{blocker}</Text> : null}
      </>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {top}
      {error ? <InlineError what="Couldn't refresh this category." onRetry={reload} /> : null}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <EntryForm
          category={c}
          teamsCount={t.teamsCount ?? 0}
          user={blocker === CLOSED ? null : user}
          now={now}
          skill={skill}
          onSkill={pending ? undefined : setSkill}
          onEditProfile={() => router.push('/profile/edit')}
        />
      </ScrollView>
      {failed && pending ? (
        <View style={s.failure}>
          <Text style={s.failTitle}>Your payment went through, but your entry isn't confirmed yet.</Text>
          <Text style={s.failBody} selectable>
            Tap Confirm my entry to try again. If it still doesn't go through, write to support@kria.club with your order ID.
          </Text>
          <Text style={s.orderId} selectable>Order ID {pending.orderId}</Text>
          <Pressable
            accessibilityRole="link"
            hitSlop={12}
            // No mail app rejects; the address is in the text above.
            onPress={() => Linking.openURL(`mailto:support@kria.club?subject=${encodeURIComponent(`Payment ${pending.orderId}`)}`).catch(() => {})}
          >
            <Text style={s.support}>Contact support</Text>
          </Pressable>
        </View>
      ) : null}
      {refusal ? <Text style={s.refusal}>{refusal}</Text> : null}
      <FooterBar><View style={s.grow}>{footer}</View></FooterBar>
      {/* Android back mid-payment (a UPI app may still be processing): ask before dropping the checkout. */}
      <Modal
        visible={!!checkout}
        animationType="slide"
        onRequestClose={() => Alert.alert('Cancel this payment?', undefined, [
          { text: 'Keep paying', style: 'cancel' },
          { text: 'Cancel payment', style: 'destructive', onPress: () => setCheckout(null) },
        ])}
      >
        <SafeAreaView style={s.root}>
          {checkout ? (
            <RazorpayWebView
              orderDetails={checkout.order}
              playerName={user ? `${user.firstName} ${user.lastName}` : ''}
              playerEmail={user?.email ?? ''}
              playerContact={user?.phone}
              onSuccess={(paymentId, signature) => onPaid(checkout, paymentId, signature)}
              onDismiss={() => setCheckout(null)}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 32 },
  skeletons: { padding: space.gutter, gap: 14 },
  lost: { marginTop: 16, marginHorizontal: space.gutter, fontFamily: font.regular, fontSize: 13, color: colors.error },
  grow: { flex: 1, gap: 8 },
  closed: { paddingVertical: 18, textAlign: 'center', fontFamily: font.medium, fontSize: 14, color: colors.text3 },
  reason: { textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  failure: { marginHorizontal: space.gutter, marginTop: 12, padding: space.cardInner, gap: 6, borderRadius: 18, backgroundColor: colors.surface1 },
  failTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.error },
  failBody: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text2 },
  orderId: { fontFamily: font.mono, fontSize: 12, color: colors.text2 },
  support: { paddingTop: 4, fontFamily: font.semibold, fontSize: 13, color: colors.text },
  refusal: { marginHorizontal: space.gutter, marginTop: 12, fontFamily: font.regular, fontSize: 13, color: colors.error },
});
