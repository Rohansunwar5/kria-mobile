import { useCallback, useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createQuickKnockout } from '@/api/quickKnockout';
import { createQuickMatch } from '@/api/quickMatch';
import { SpotSheet } from '@/components/host/SpotSheet';
import { Done, FormatStep, KnockoutNameStep, ReviewStep, SidesStep, SportStep } from '@/components/host/Steps';
import { FooterBar, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { colors, font, motion, space } from '@/constants/theme';
import { buildBody, buildKnockoutBody, initialForm, namesReady, setSpot, slotsFor } from '@/lib/hostMatch';
import { goBack } from '@/lib/nav';
import { useAppSelector } from '@/store/hooks';

const STEPS = 4;

/**
 * Host a match (mock 1d): sport → format → sides → review, then the code.
 * Format also picks one match or a knockout; a knockout names itself instead
 * of two sides. Values survive Back.
 */
export default function HostMatch() {
  const user = useAppSelector((s) => s.auth.user);
  const host = { playerId: user?._id, name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'You' };
  const [f, setF] = useState(() => initialForm(user?.sport));
  const [step, setStep] = useState(1);
  // What was created, as the done screen needs it.
  const [created, setCreated] = useState<{ id: string; code: string; live: boolean; knockout: boolean } | null>(null);
  // The server's own default when a knockout is left unnamed (quickKnockout.service create).
  const defaultName = `${user?.firstName?.trim().split(/s+/)[0] || 'My'}'s Knockout`;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [editing, setEditing] = useState<{ side: 0 | 1; index: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const leave = () => goBack(router, '/(tabs)/compete');
  const back = useCallback(() => {
    if (!created && step > 1) setStep(step - 1);
    else leave();
    return true;
  }, [created, step]);
  // Android back steps back through the flow too, not straight out of it.
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]));
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const canNext = step !== 3 || namesReady(f);
  const next = async () => {
    if (!canNext || busy) return;
    if (step < STEPS) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      if (f.kind === 'knockout') {
        const k = await createQuickKnockout(buildKnockoutBody(f));
        setCreated({ id: k._id, code: k.joinCode ?? '', live: false, knockout: true });
      } else {
        const m = await createQuickMatch(buildBody(f, host));
        setCreated({ id: m._id, code: m.joinCode, live: m.status === 'live', knockout: false });
      }
    } catch (err) {
      // The validator's own message where it gives one (DESIGN §8).
      setProblem((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Couldn't create the match. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const spots = editing ? slotsFor(f, editing.side, host) : [];
  const taken = [host.playerId, ...f.spotsA.map((s) => s.playerId), ...f.spotsB.map((s) => s.playerId)].filter(Boolean) as string[];

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar
        title={f.kind === 'knockout' ? 'Host a knockout' : 'Host a match'}
        icon={created || step === 1 ? 'close' : 'arrow_back'}
        onBack={back}
        right={created ? null : <Text style={s.stepLabel}>{`${step} of ${STEPS}`}</Text>}
      />
      <View style={s.progress} accessibilityElementsHidden>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[s.segment, { backgroundColor: created || i < step ? colors.accent : colors.lineStrong }]} />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 32 }}>
          <Animated.View key={created ? 'done' : step} entering={FadeIn.duration(motion.enter)}>
            {created ? (
              <Done code={created.code} note={created.live ? 'live' : 'wait'} knockout={created.knockout} />
            ) : step === 1 ? (
              <SportStep f={f} set={setF} />
            ) : step === 2 ? (
              <FormatStep f={f} set={setF} />
            ) : step === 3 && f.kind === 'knockout' ? (
              <KnockoutNameStep f={f} set={setF} defaultName={defaultName} />
            ) : step === 3 ? (
              <SidesStep f={f} set={setF} host={host} onSpot={(side, index) => setEditing({ side, index })} />
            ) : (
              <ReviewStep f={f} set={setF} host={host} defaultName={defaultName} onEdit={setStep} />
            )}
          </Animated.View>
          {problem ? <Text style={s.problem}>{problem}</Text> : null}
        </ScrollView>

        <FooterBar>
          {created ? (
            <>
              <Button
                variant="secondary"
                icon={copied ? 'check' : 'content_copy'}
                label={copied ? 'Copied' : 'Copy code'}
                onPress={() => Clipboard.setStringAsync(created.code).then(() => setCopied(true), () => undefined)}
                style={{ flex: 1 }}
              />
              <Button
                label={created.knockout ? 'Open knockout' : 'Open match room'}
                onPress={() => router.replace(created.knockout ? `/knockout/${created.id}` : `/quick/${created.id}`)}
                style={{ flex: 1.3 }}
              />
            </>
          ) : (
            <Button
              label={step === STEPS ? (f.kind === 'knockout' ? 'Create knockout' : 'Create match') : 'Continue'}
              busy={busy}
              busyLabel={f.kind === 'knockout' ? 'Creating knockout' : 'Creating match'}
              disabled={!canNext}
              onPress={next}
              style={{ flex: 1 }}
            />
          )}
        </FooterBar>
      </KeyboardAvoidingView>

      <SpotSheet
        open={!!editing}
        current={editing ? spots[editing.index]?.spot ?? { name: '' } : { name: '' }}
        taken={taken}
        onClose={() => setEditing(null)}
        onPick={(spot) => {
          if (editing) setF(setSpot(f, editing.side, editing.index, spot));
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  stepLabel: { fontFamily: font.regular, fontSize: 13, color: colors.text3, fontVariant: ['tabular-nums'] },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: space.gutter },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  problem: { paddingTop: 16, fontFamily: font.regular, fontSize: 13, color: colors.error },
});
