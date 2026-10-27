import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Matches } from '@/components/compete/Matches';
import { Rankings } from '@/components/compete/Rankings';
import { TAB_BAR_SPACE } from '@/components/navigation/TabBar';
import { Segmented } from '@/components/ui/Segmented';
import { colors, display, motion, space } from '@/constants/theme';
import { sportsByRecency } from '@/lib/homeView';
import { RANKED_SPORTS } from '@/lib/sports';
import { useCareer } from '@/lib/useCareer';
import { useAppSelector } from '@/store/hooks';

type Seg = 'rankings' | 'matches';

/** Compete tab (mocks 1b, 1c, 4b, 4c): Rankings · Matches. */
export default function Compete() {
  const user = useAppSelector((s) => s.auth.user);
  const meId = user?._id ?? '';
  const insets = useSafeAreaInsets();
  const career = useCareer(user?._id);
  const params = useLocalSearchParams<{ seg?: string; sport?: string }>();
  const [seg, setSeg] = useState<Seg>('rankings');
  const [picked, setPicked] = useState<string>();
  const scroll = useRef<ScrollViewInstance>(null);
  useScrollToTop(scroll);

  // Home links here with ?seg= or ?sport=; take them once, then clear them so
  // the same link works again after you've moved around.
  useEffect(() => {
    if (!params.seg && !params.sport) return;
    if (params.seg === 'matches' || params.seg === 'rankings') setSeg(params.seg);
    if (params.sport && RANKED_SPORTS.includes(params.sport)) {
      setPicked(params.sport);
      setSeg('rankings');
    }
    router.setParams({ seg: undefined, sport: undefined });
  }, [params.seg, params.sport]);

  const seen = useRef(false);
  const reloadCareer = career.reload;
  useFocusEffect(
    useCallback(() => {
      if (seen.current) reloadCareer();
      seen.current = true;
    }, [reloadCareer]),
  );

  // Opens on the rankable sport you played most recently, else your primary sport.
  const played = sportsByRecency(career.profile?.sports ?? [], career.recent ?? []).map((s) => s.sport);
  const sport = picked ?? [...played, user?.sport ?? ''].find((sp) => RANKED_SPORTS.includes(sp)) ?? RANKED_SPORTS[0];
  const meName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom }}>
        <View style={s.header}>
          <Text style={display(40)}>Compete</Text>
          <Segmented<Seg> options={[{ key: 'rankings', label: 'Rankings' }, { key: 'matches', label: 'Matches' }]} value={seg} onChange={setSeg} />
        </View>
        {/* Motion: the content crossfades while the thumb slides, so the two don't compete. */}
        <Animated.View key={seg} entering={FadeIn.duration(motion.enter)}>
          {seg === 'rankings' ? (
            <Rankings sport={sport} onSport={setPicked} meId={meId} meName={meName} mine={career.profile?.sports ?? null} onPlay={() => setSeg('matches')} />
          ) : (
            <Matches meId={meId} />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingHorizontal: space.gutter },
});
