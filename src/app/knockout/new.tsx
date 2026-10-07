import { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/icons';
import { ChoiceCard, Segmented, Stepper } from '@/components/quick/HostSteps';
import { createQuickKnockout, type CreateKnockoutBody } from '@/api/quickKnockout';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/lib/theme';
import { goBack } from '@/lib/nav';
import { BEST_OF, POINTS } from '@/lib/quickHostWizard';

const STEPS = ['sport', 'format', 'name', 'review'] as const;
const COPY: Record<(typeof STEPS)[number], { title: string; sub: string }> = {
  sport: { title: 'Pick a sport', sub: 'Every match in the knockout is this sport.' },
  format: { title: 'Set the format', sub: 'Every match in the knockout uses it.' },
  name: { title: 'Name it', sub: 'Optional. The winner gets "Won <name>" on their profile.' },
  review: { title: 'Ready to go?', sub: 'Next, you get a code to share. Players join themselves.' },
};

export default function NewKnockoutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);
  const defaultName = `${user?.firstName ?? 'My'}'s Knockout`;

  const [index, setIndex] = useState(0);
  const [sport, setSport] = useState<'badminton' | 'cricket'>('badminton');
  const [maxOvers, setMaxOvers] = useState(8);
  const [squad, setSquad] = useState(6);
  const [teamCount, setTeamCount] = useState(4);
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(1);
  const [pointsToWin, setPointsToWin] = useState<11 | 15 | 21>(21);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const step = STEPS[index];
  const back = () => (index === 0 ? goBack(router, '/quick') : setIndex(index - 1));

  const create = async () => {
    setBusy(true);
    setProblem('');
    const body: CreateKnockoutBody = sport === 'cricket'
      ? { sport: 'cricket', matchConfig: { maxOvers, playersPerTeam: squad }, teamCount }
      : { format, matchConfig: { bestOf, pointsToWin } };
    if (name.trim()) body.name = name.trim();
    try {
      const created = await createQuickKnockout(body);
      router.replace({ pathname: '/knockout/[id]', params: { id: created._id } });
    } catch (err) {
      setProblem((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not create the knockout. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const label = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={8} style={{ width: 44, height: 44, justifyContent: 'center' }}>
              <Icon name="arrow-left" size={22} color={t.text} />
            </Pressable>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 0.14 * 11, color: t.textMeta }}>{`0${index + 1} / 0${STEPS.length}`}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
            {STEPS.map((s, n) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 1, backgroundColor: n <= index ? t.brand : t.fill }} />)}
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 32 }}>
          <Text style={{ ...label, color: t.brandInk }}>New knockout</Text>
          <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 32, lineHeight: 39, textTransform: 'uppercase', color: t.text, marginTop: 6 }}>{COPY[step].title}</Text>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 4, marginBottom: 24 }}>{COPY[step].sub}</Text>

          {step === 'sport' ? (
            <View style={{ gap: 12 }}>
              <ChoiceCard icon="shuttlecock" title="Badminton" hint="Singles or doubles, 3 to 16 entrants" selected={sport === 'badminton'} onPress={() => setSport('badminton')} />
              <ChoiceCard icon="cricket-bat" title="Cricket" hint="Teams of up to 11, 3 to 8 teams" selected={sport === 'cricket'} onPress={() => setSport('cricket')} />
            </View>
          ) : null}

          {step === 'format' && sport === 'cricket' ? (
            <>
              <Stepper title="Overs per innings" value={maxOvers} min={1} max={50} presets={[5, 8, 10, 20]} onChange={setMaxOvers} hint="Each team bats for this many overs." />
              <Stepper title="Players per team" value={squad} min={2} max={11} presets={[4, 6, 8, 11]} onChange={setSquad} hint="The most a team can have. A team a player short still plays." />
              <Stepper title="Teams" value={teamCount} min={3} max={8} presets={[3, 4, 6, 8]} onChange={setTeamCount} hint="Players pick a team when they join. You can add or remove teams later." />
            </>
          ) : null}

          {step === 'format' && sport === 'badminton' ? (
            <>
              <Segmented title="Format" options={[{ value: 'singles' as const, label: 'Singles', sub: '1 v 1' }, { value: 'doubles' as const, label: 'Doubles', sub: '2 v 2' }]} value={format} onChange={setFormat} />
              <Segmented title="Match length" options={([1, 3, 5] as const).map((n) => ({ value: n, label: BEST_OF[n].label }))} value={bestOf} onChange={setBestOf} hint={BEST_OF[bestOf].hint} />
              <Segmented title="Points per game" options={([11, 15, 21] as const).map((n) => ({ value: n, label: String(n), sub: POINTS[n] }))} value={pointsToWin} onChange={setPointsToWin} />
            </>
          ) : null}

          {step === 'name' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={defaultName}
              placeholderTextColor={t.textFaint}
              maxLength={40}
              style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15, color: t.text, borderWidth: 1.5, borderColor: t.line, borderRadius: 5, backgroundColor: t.fillSoft, paddingHorizontal: 12, minHeight: 48 }}
            />
          ) : null}

          {step === 'review' ? (
            <View style={{ borderRadius: 6, borderWidth: 1.5, borderColor: t.line, backgroundColor: t.surface, padding: 18 }}>
              <Text style={{ ...label, color: t.brandInk }}>{`Knockout · ${sport === 'cricket' ? 'cricket' : format}`}</Text>
              <Text style={{ fontFamily: 'Anton_400Regular', fontSize: 28, lineHeight: 34, textTransform: 'uppercase', color: t.text, marginTop: 8 }}>{name.trim() || defaultName}</Text>
              <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: t.textMeta, marginTop: 6 }}>
                {sport === 'cricket'
                  ? `${maxOvers} overs · up to ${squad} a side · ${teamCount} teams`
                  : `${BEST_OF[bestOf].label} · ${pointsToWin} points · 3 to 16 entrants`}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg }}>
          {problem ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk, marginBottom: 10 }}>{problem}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={step === 'review' ? create : () => setIndex(index + 1)}
            style={{ minHeight: 52, borderRadius: 5, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, letterSpacing: 0.14 * 13, textTransform: 'uppercase', color: t.onBrand }}>
              {step === 'review' ? 'Create knockout' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
