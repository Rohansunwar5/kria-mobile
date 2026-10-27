import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { colors, display, font, radius } from '@/constants/theme';
import { KriaMark } from '@/components/KriaMark';
import { CompeteCard, PlayCard, TournamentsCard } from '@/components/signin/IntroCards';
import { Button } from '@/components/ui/Button';
import { FooterBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { RANKED_SPORTS } from '@/lib/sports';
import { RANK_MIN, sportName } from '@/lib/homeView';

const ranked = RANKED_SPORTS.map((k) => sportName(k).toLowerCase()).join(' and ');
const PAGES = [
  { tag: '01 / 03 · PLAY', title: 'Host a match in seconds.', line: 'Start a quick match, share the code, and friends join from their phones. Every result goes on your record.', card: <PlayCard /> },
  { tag: '02 / 03 · COMPETE', title: 'Climb the leaderboard.', line: `You're ranked by win rate in ${ranked}. Ten decided matches and you're on the board.`, card: <CompeteCard sports={RANKED_SPORTS} rankMin={RANK_MIN} /> },
  { tag: '03 / 03 · TOURNAMENTS', title: 'Enter real tournaments.', line: 'Register for events near you, get picked in team auctions, follow the bracket live and earn awards.', card: <TournamentsCard /> },
];

export default function Intro() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const register = () => router.push('/(auth)/register');
  const go = (i: number) => { setPage(i); pager.current?.scrollTo({ x: i * width, animated: !reduced }); };
  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.head}>
        <Tap accessibilityLabel="Back" onPress={() => router.back()} style={s.back}><Icon name="arrow_back" size={24} /></Tap>
        <KriaMark width={46} />
        {last ? <View style={s.back} /> : (
          <Tap accessibilityLabel="Skip" onPress={register} style={s.skip}><Text style={s.skipText}>Skip</Text></Tap>
        )}
      </View>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onSettle} style={{ flex: 1 }}>
        {PAGES.map((p) => (
          // 7a–7c: the card up top, the words at the bottom above the dots.
          <ScrollView key={p.tag} style={{ width }} contentContainerStyle={s.page}>
            <View style={s.card}>{p.card}</View>
            <View style={{ gap: 12 }}>
              <Text style={s.tag}>{p.tag}</Text>
              <Text style={display(44)}>{p.title}</Text>
              <Text style={s.line}>{p.line}</Text>
            </View>
          </ScrollView>
        ))}
      </ScrollView>
      <FooterBar>
        <View style={s.foot}>
          <View style={s.dots}>{PAGES.map((p, i) => <View key={p.tag} style={[s.dot, i === page && s.dotOn]} />)}</View>
          {last ? <Button label="Create my account" onPress={register} /> : (
            <Tap accessibilityLabel="Next" onPress={() => go(page + 1)} style={s.next}><Text style={s.nextText}>Next</Text></Tap>
          )}
        </View>
      </FooterBar>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skip: { height: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: font.semibold, fontSize: 14, color: colors.text2 },
  page: { flexGrow: 1, justifyContent: 'space-between', gap: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  card: { marginHorizontal: 12 }, // 36px from the edge, as in the mock
  tag: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1, color: colors.accent },
  line: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.text2 },
  foot: { flex: 1, gap: 24 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface3 },
  dotOn: { width: 22, backgroundColor: colors.text },
  // 7a/7b: the white Next; 7c's Create my account is the intro's only orange button.
  next: { height: 56, borderRadius: radius.button, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: font.bold, fontSize: 15, color: colors.bg },
});
