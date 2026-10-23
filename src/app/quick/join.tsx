import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { claimQuickMatchSlot } from '@/api/quickMatch';
import { claimKnockoutGuest, joinQuickKnockout, resolveQuickCode, type QuickCode } from '@/api/quickKnockout';
import { FooterBar, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import { joinView } from '@/lib/joinView';
import { goBack } from '@/lib/nav';
import { useAppSelector } from '@/store/hooks';

const FALLBACK = '/(tabs)/compete?seg=matches';

const serverMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function JoinScreen() {
  const { code = '' } = useLocalSearchParams<{ code?: string }>();
  const user = useAppSelector((s) => s.auth.user);
  const [found, setFound] = useState<QuickCode | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const inFlight = useRef(false);
  const alive = useRef(true);
  const latest = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const lookup = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const res = await resolveQuickCode(code);
      if (alive.current && mine === latest.current) setFound(res);
    } catch (err) {
      if (alive.current && mine === latest.current) setProblem(serverMessage(err, 'No match or knockout found for that code.'));
    }
  }, [code]);

  useEffect(() => {
    if (!code) router.replace(FALLBACK as never);
    else lookup();
  }, [code, lookup]);

  /** One request at a time. `onFail` runs after a rejection, before the message shows. */
  const run = async (
    action: () => Promise<{ _id: string }>,
    path: '/quick/[id]' | '/knockout/[id]',
    failMsg: string,
    onFail?: () => Promise<void>,
  ) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setProblem('');
    try {
      const res = await action();
      if (alive.current) router.replace({ pathname: path, params: { id: res._id } });
    } catch (err) {
      const message = serverMessage(err, failMsg);
      await onFail?.();
      if (alive.current) setProblem(message);
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const view = found && joinView(found, user?._id ?? '');
  const openId = found?.data._id ?? '';
  const openRoute = () =>
    router.replace({ pathname: view?.kind === 'match' ? '/quick/[id]' : '/knockout/[id]', params: { id: openId } });

  // The spot may be gone by now: clear the pick and re-read, so it shows Taken.
  const take = () =>
    slotId &&
    run(() => claimQuickMatchSlot(code, slotId), '/quick/[id]', 'Could not claim that slot.', async () => {
      if (alive.current) setSlotId(null);
      await lookup();
    });
  const join = () =>
    run(() => (teamId ? joinQuickKnockout(code, teamId) : joinQuickKnockout(code)), '/knockout/[id]', 'Could not join that knockout.');
  const claimGuest = (key: string) => run(() => claimKnockoutGuest(code, key), '/knockout/[id]', 'Could not join that knockout.');

  let footer: React.ReactNode = null;
  if (view?.mine) footer = <Button label="Open" onPress={openRoute} />;
  else if (view?.kind === 'match' && !view.full) {
    footer = <Button label="Take this spot" busyLabel="Taking this spot" busy={busy} disabled={!slotId} onPress={take} />;
  } else if (view?.kind === 'knockout' && !view.closed) {
    footer = <Button label={`Join as ${user ? `${user.firstName} ${user.lastName}` : 'yourself'}`} busy={busy} onPress={join} />;
  }

  return (
    <SafeAreaView style={s.screen}>
      <TopBar title="Join" onBack={() => goBack(router, FALLBACK)} />
      <ScrollView contentContainerStyle={s.body}>
        {!view && !problem ? <Skeleton style={{ height: 120 }} /> : null}
        {!view && problem ? <Text style={s.error}>{problem}</Text> : null}
        {view ? (
          <>
            <View style={{ gap: 8 }}>
              <Text style={s.kicker}>{view.kicker}</Text>
              <Text style={display(34)}>{view.title}</Text>
              <View style={s.formatRow}>
                <Text style={s.format}>{view.kind === 'match' ? view.format : `${view.format} · hosted by ${view.host}`}</Text>
                {view.kind === 'match' ? <Text style={s.chip}>{view.code}</Text> : null}
              </View>
              {view.kind === 'knockout' ? (
                <Text style={s.format}>{`${view.count} ${view.count === 1 ? 'player' : 'players'} in so far`}</Text>
              ) : null}
            </View>

            {view.mine ? (
              <Text style={s.note}>{view.kind === 'match' ? "You're in this match" : "You're in"}</Text>
            ) : view.kind === 'match' ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={s.section}>Pick your spot</Text>
                  <Text style={s.sub}>Take the spot the host made for you, or any open one.</Text>
                </View>
                {view.full ? <Text style={s.note}>Every spot is taken. Ask the host to add you.</Text> : null}
              </>
            ) : view.closed ? (
              <Text style={s.note}>{view.closed}</Text>
            ) : null}

            {view.kind === 'match'
              ? view.sides.map((side) => (
                  <View key={side.name} style={{ gap: 8 }}>
                    <Text style={s.side}>{side.name}</Text>
                    {side.slots.map((sl) => {
                      const on = slotId === sl.slotId;
                      const pickable = !sl.taken && !view.mine;
                      return (
                        <Tap
                          key={sl.slotId}
                          disabled={!pickable || busy}
                          accessibilityState={{ selected: on, disabled: !pickable }}
                          onPress={() => setSlotId(sl.slotId)}
                          style={[s.slot, on && s.ring]}
                        >
                          <View style={[s.avatar, sl.taken ? s.avTaken : on ? s.avOn : s.avOpen]}>
                            {sl.taken ? (
                              <Text style={s.ini}>{sl.ini}</Text>
                            ) : (
                              <Icon name={on ? 'check' : 'add'} size={18} color={on ? colors.onAccent : colors.text2} />
                            )}
                          </View>
                          <Text style={[s.slotName, sl.taken && { color: colors.text3 }]}>{sl.name}</Text>
                          <Text style={[s.state, { color: sl.taken ? colors.text4 : colors.accentInk }]}>{sl.taken ? 'Taken' : 'Open'}</Text>
                        </Tap>
                      );
                    })}
                  </View>
                ))
              : null}

            {view.kind === 'knockout' && !view.mine && !view.closed ? (
              <>
                {view.teams ? (
                  <View style={{ gap: 8 }}>
                    <View style={{ gap: 4, marginBottom: 10 }}>
                      <Text style={s.section}>Pick your team</Text>
                      <Text style={s.sub}>Or leave it to the draw.</Text>
                    </View>
                    {view.teams.map((t) => (
                      <Tap
                        key={t.teamId}
                        disabled={t.full || busy}
                        accessibilityState={{ selected: teamId === t.teamId, disabled: t.full }}
                        onPress={() => setTeamId(t.teamId)}
                        style={[s.slot, teamId === t.teamId && s.ring, t.full && { opacity: 0.45 }]}
                      >
                        <Text style={s.slotName}>{t.name}</Text>
                        <Text style={s.state}>{t.count}</Text>
                      </Tap>
                    ))}
                    <Tap disabled={busy} accessibilityState={{ selected: teamId === null }} onPress={() => setTeamId(null)} style={[s.slot, teamId === null && s.ring]}>
                      <Text style={s.slotName}>Any team</Text>
                      <Text style={s.state}>The draw places you</Text>
                    </Tap>
                  </View>
                ) : null}
                {view.guests.length ? (
                  <View style={{ gap: 4 }}>
                    <Text style={s.section}>Already added by the host?</Text>
                    <Text style={s.sub}>Tap your name to take that place.</Text>
                    <View style={s.chips}>
                      {view.guests.map((g) => (
                        <Tap key={g.playerKey} disabled={busy} onPress={() => claimGuest(g.playerKey)} style={s.guest}>
                          <Text style={s.guestText}>{g.name}</Text>
                        </Tap>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      {view && problem ? <Text style={[s.error, { paddingHorizontal: space.gutter, paddingBottom: 8 }]}>{problem}</Text> : null}
      {footer ? <FooterBar>{footer}</FooterBar> : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: space.gutter, paddingTop: 8, paddingBottom: 32, gap: space.sectionGap },
  kicker: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  format: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  chip: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.4, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 7, backgroundColor: colors.surface1, color: colors.text2, overflow: 'hidden' },
  section: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  side: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  note: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text2 },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.error },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface1, borderWidth: 1.5, borderColor: 'transparent' },
  ring: { borderColor: colors.accent },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avTaken: { backgroundColor: colors.surface2 },
  avOpen: { backgroundColor: colors.surface3 },
  avOn: { backgroundColor: colors.accent },
  ini: { fontFamily: font.semibold, fontSize: 11, color: colors.text2 },
  slotName: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text },
  state: { fontFamily: font.semibold, fontSize: 12, color: colors.text3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  guest: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface1 },
  guestText: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
});
