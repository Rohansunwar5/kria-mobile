import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font, radius } from '@/constants/theme';
import { useAppDispatch } from '@/store/hooks';
import { updateProfile } from '@/store/slices/authSlice';
import { latestTournaments } from '@/api/tournaments';
import { citySuggestions } from '@/lib/authForms';
import { EVENT_SPORTS } from '@/lib/eventsList';
import { sportName } from '@/lib/homeView';
import { AuthScreen, Title } from '@/components/signin/AuthScreen';
import { Field } from '@/components/signin/Field';
import { Button } from '@/components/ui/Button';
import { Icon, sportIcon } from '@/components/ui/Icon';

export default function YourGame() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [sport, setSport] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    // Upcoming only: GET /tournament has no date filter, so keep events starting today or later.
    const today = new Date().setHours(0, 0, 0, 0);
    latestTournaments(20, {})
      .then((t) => { if (alive.current) setChips(citySuggestions(t.filter((x) => +new Date(x.startDate) >= today))); })
      .catch(() => {});
  }, []);

  const next = () => router.push('/(onboarding)/for-tournaments');
  const save = async () => {
    if (inFlight.current || !sport) return;
    inFlight.current = true;
    setBusy(true);
    const location = city.trim();
    const res = await dispatch(updateProfile({ data: { sport, ...(location ? { location } : {}) } }));
    inFlight.current = false;
    if (!alive.current) return;
    setBusy(false);
    if (updateProfile.fulfilled.match(res)) { next(); return; }
    setError((res.payload as string) || 'Something went wrong');
  };

  return (
    <AuthScreen
      label="Your profile · 1 of 2"
      right={<Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={next} hitSlop={8}><Text style={s.skip}>Skip</Text></Pressable>}
      footer={
        <View style={{ gap: 12 }}>
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Continue" busy={busy} disabled={!sport} onPress={save} />
        </View>
      }
    >
      <Title sub="This sets your home ranking. You can still play and be ranked in any sport we rank.">What do you play most?</Title>
      <View style={s.tiles}>
        {EVENT_SPORTS.map((k) => {
          const on = sport === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={sportName(k)}
              accessibilityState={{ selected: on }}
              onPress={() => { setSport(k); setError(null); }}
              style={[s.tile, on && s.tileOn]}
            >
              <Icon name={sportIcon(k)} size={28} color={on ? colors.accent : colors.text3} />
              <Text style={s.tileLabel}>{sportName(k)}</Text>
              {on ? <View style={s.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 10 }}>
        <Field label="City" value={city} onChangeText={setCity} autoCapitalize="words" returnKeyType="done" />
        {chips.length ? (
          <View style={s.chips}>
            {chips.map((c) => (
              <Pressable key={c} accessibilityRole="button" accessibilityLabel={`City suggestion ${c}`} onPress={() => setCity(c)} style={s.chip}>
                <Text style={s.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  skip: { fontFamily: font.semibold, fontSize: 14, color: colors.text2, paddingRight: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', height: 96, borderRadius: radius.input, backgroundColor: colors.surface1, padding: 14, justifyContent: 'space-between', borderWidth: 1.5, borderColor: 'transparent' },
  tileOn: { borderColor: colors.text },
  tileLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  dot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface1, justifyContent: 'center' },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  err: { fontFamily: font.regular, fontSize: 13, color: colors.error },
});
