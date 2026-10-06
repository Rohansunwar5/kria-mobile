import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { FormatStep, PlayersStep, ReviewStep, RoleStep, SportStep } from '@/components/quick/HostSteps';
import { createQuickMatch } from '@/api/quickMatch';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';
import { DUR, OUT, usePress } from '@/lib/motion';
import { validateCricketConfig } from '@/lib/quickCricketCreate';
import { INITIAL_DRAFT, STEPS, buildCreateBody, playersBlocker, type HostDraft, type SlotDraft, type Step } from '@/lib/quickHostWizard';

function copyFor(step: Step, d: HostDraft): { title: string; sub: string } {
  switch (step) {
    case 'sport':
      return { title: 'What are we playing?', sub: 'Pick a sport to set the match up.' };
    case 'role':
      return { title: 'Are you in the match?', sub: 'Only the people playing get it on their record.' };
    case 'format':
      return { title: 'Set the format', sub: 'Already set to the usual game. Change anything you like.' };
    case 'players':
      return d.sport === 'badminton'
        ? { title: "Who's playing?", sub: 'Find someone on Kria, or just type a name.' }
        : { title: 'Name the teams', sub: 'Or skip it — they go out as Team A and Team B.' };
    case 'review':
      return { title: 'Ready to go?', sub: 'Tap anything to change it.' };
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function NewQuickMatchScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);
  const host: SlotDraft = { playerId: user?._id, displayName: user ? `${user.firstName} ${user.lastName}` : 'You' };

  const [draft, setDraft] = useState<HostDraft>(INITIAL_DRAFT);
  const patch = (next: Partial<HostDraft>) => setDraft((d) => ({ ...d, ...next }));
  const [index, setIndex] = useState(0);
  const [forward, setForward] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState('');
  const { press, onPressIn, onPressOut } = usePress();
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.015 }] }));

  const step = STEPS[index];
  const go = (to: number) => {
    setForward(to > index);
    setProblem('');
    setIndex(to);
  };
  const back = () => (index === 0 ? router.back() : go(index - 1));

  // Android's back button walks the steps too; only step 1 leaves the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      go(index - 1);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const start = async () => {
    if (draft.sport === 'cricket') {
      const invalid = validateCricketConfig(draft);
      if (invalid) return setProblem(invalid);
    }
    setSubmitting(true);
    setProblem('');
    try {
      const created = await createQuickMatch(buildCreateBody(draft, host));
      router.replace({ pathname: '/quick/[id]', params: { id: created._id } });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProblem(message || 'Could not create the match. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 'review') return start();
    const blocker = step === 'players' ? playersBlocker(draft, host) : null;
    if (blocker) return setProblem(blocker);
    go(index + 1);
  };

  const { title, sub } = copyFor(step, draft);
  // Sport and role are one-tap questions: the answer is the button.
  const cta = step === 'sport' || step === 'role' ? null : step === 'review' ? 'Start match' : 'Continue';

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
              <Icon name="arrow-left" size={22} color={t.text} />
            </Pressable>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.14 * 11, color: t.textMeta }}>
              {`${pad(index + 1)} / ${pad(STEPS.length)}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
            {STEPS.map((s, n) => (
              <View key={s} style={{ flex: 1, height: 4, borderRadius: 1, backgroundColor: n <= index ? t.brand : t.fill }} />
            ))}
          </View>
        </View>

        <Animated.View
          key={step}
          entering={(forward ? FadeInRight : FadeInLeft).duration(DUR.sweep).easing(OUT)}
          style={{ flex: 1 }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 32 }}>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase', color: t.brandInk }}>
              New quick match
            </Text>
            <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 32, lineHeight: 39, textTransform: 'uppercase', color: t.text, marginTop: 6 }}>
              {title}
            </Text>
            <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 4, marginBottom: 24 }}>
              {sub}
            </Text>

            {step === 'sport' ? <SportStep draft={draft} onPick={(sport) => { patch({ sport }); go(1); }} /> : null}
            {step === 'role' ? <RoleStep draft={draft} onPick={(hostPlays) => { patch({ hostPlays }); go(2); }} /> : null}
            {step === 'format' ? <FormatStep draft={draft} patch={patch} /> : null}
            {step === 'players' ? <PlayersStep draft={draft} patch={patch} host={host} /> : null}
            {step === 'review' ? <ReviewStep draft={draft} host={host} onEdit={go} /> : null}
          </ScrollView>
        </Animated.View>

        {cta ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg }}>
            {problem ? (
              <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk, marginBottom: 10 }}>{problem}</Text>
            ) : null}
            <Animated.View style={pressStyle}>
              <Pressable
                accessibilityRole="button"
                onPress={next}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={submitting}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  minHeight: 52,
                  borderRadius: 5,
                  backgroundColor: t.brand,
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {submitting ? <ActivityIndicator color={t.onBrand} /> : null}
                <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, letterSpacing: 0.14 * 13, textTransform: 'uppercase', color: t.onBrand }}>
                  {cta}
                </Text>
                {submitting ? null : <Icon name="arrow-right" size={18} color={t.onBrand} />}
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
