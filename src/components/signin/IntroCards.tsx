import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '@/constants/theme';
import { latestTournaments } from '@/api/tournaments';
import { AwardBadge } from '@/components/AwardBadge';
import { KriaMark } from '@/components/KriaMark';
import { Icon } from '@/components/ui/Icon';
import { formatShortDate } from '@/lib/format';
import { sportName } from '@/lib/homeView';
import type { Tournament } from '@/store/slices/tournamentSlice';

const Bar = ({ w, h = 10 }: { w: number | `${number}%`; h?: number }) => <View style={{ width: w, height: h, borderRadius: 5, backgroundColor: colors.surface3 }} />;
const Dot = ({ size = 30 }: { size?: number }) => <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface3 }} />;

/** 7a: an illustration, no names or codes. */
export function PlayCard() {
  return (
    <View style={s.stack}>
      <View style={s.card}>
        <Text style={s.cardHead}>Badminton · Quick match</Text>
        <View style={s.codeRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => <View key={i} style={s.codeBox}><Text style={s.codeDot}>·</Text></View>)}
        </View>
        <View style={s.roster}><Dot /><Text style={s.rosterName}>You · Host</Text></View>
        <View style={s.roster}>
          <Dot /><Text style={[s.rosterName, { flex: 1 }]}>Your friend · Joined</Text>
          <Icon name="check" size={20} color={colors.accent} />
        </View>
      </View>
      <Text style={s.result}>You won 2–0 · Added to your record</Text>
    </View>
  );
}

const MEDALS = [colors.gold, colors.silver, colors.bronze];

/** 7b: an illustration (rankings need login, gap #36). Static, no shimmer. */
export function CompeteCard({ sports, rankMin }: { sports: string[]; rankMin: number }) {
  return (
    <View style={s.card}>
      <View style={s.pills}>
        {sports.map((k, i) => (
          <View key={k} style={[s.pill, i === 0 && { backgroundColor: colors.accentTint }]}>
            <Text style={[s.pillText, i === 0 && { color: colors.accentInk }]}>{sportName(k)}</Text>
          </View>
        ))}
      </View>
      <Text style={s.mono}>WIN RATE</Text>
      {MEDALS.map((c, i) => (
        <View key={i} style={s.rank}>
          <Text style={[s.rankNo, { color: c }]}>{i + 1}</Text><Dot /><View style={{ flex: 1 }}><Bar w="60%" /></View><Bar w={36} />
        </View>
      ))}
      <View style={[s.rank, { backgroundColor: colors.accentTint, borderRadius: 12, paddingHorizontal: 8 }]}>
        <Text style={[s.rankNo, { color: colors.accentInk }]}>4</Text><Dot />
        <Text style={[s.rosterName, { flex: 1 }]}>You · {rankMin} matches to go</Text>
      </View>
    </View>
  );
}

/** 7c: the soonest open tournament with a banner; the mark on surface1 when there is none. */
export function TournamentsCard() {
  const alive = useRef(true);
  const [t, setT] = useState<Tournament | null>(null);
  useEffect(() => {
    alive.current = true;
    latestTournaments(10, { status: 'registration_open' })
      .then((list) => {
        const open = list.filter((x) => x.status === 'registration_open' && x.bannerImage);
        const now = Date.now();
        const upcoming = open.filter((x) => new Date(x.startDate).getTime() >= now).sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
        const next = upcoming[0] ?? open[0];
        if (alive.current && next) setT(next);
      })
      .catch(() => {});
    return () => { alive.current = false; };
  }, []);
  return (
    <View style={s.stack}>
      <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
        {t ? (
          <>
            <Image source={{ uri: t.bannerImage }} style={{ height: 128, width: '100%' }} accessible={false} />
            <View style={{ padding: 16, gap: 6 }}>
              <Text style={s.tName}>{t.name}</Text>
              <Text style={s.tOpen}>Registration open</Text>
              <Text style={s.tMeta}>{[formatShortDate(t.startDate), t.venue?.city].filter(Boolean).join(' · ')}</Text>
            </View>
          </>
        ) : (
          <View style={s.empty}><KriaMark width={56} /></View>
        )}
      </View>
      <View style={[s.card, s.award]}>
        <AwardBadge shape="shield" metal="gold" size={56} ribbon="CHAMPION" laurel />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rosterName}>Champion</Text>
          <Text style={s.tMeta}>Awarded by the organiser</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 14 },
  card: { backgroundColor: colors.surface1, borderRadius: radius.card, padding: 16, gap: 12 },
  cardHead: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeBox: { flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  codeDot: { fontFamily: font.semibold, fontSize: 20, color: colors.text4 },
  roster: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rosterName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  result: { fontFamily: font.semibold, fontSize: 14, color: colors.text2, textAlign: 'center' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface2, justifyContent: 'center' },
  pillText: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  mono: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1, color: colors.text4 },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  rankNo: { width: 16, fontFamily: font.display, fontSize: 18 },
  tName: { fontFamily: font.bold, fontSize: 17, color: colors.text },
  tOpen: { fontFamily: font.semibold, fontSize: 13, color: colors.accentInk },
  tMeta: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  empty: { height: 218, alignItems: 'center', justifyContent: 'center' },
  award: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
