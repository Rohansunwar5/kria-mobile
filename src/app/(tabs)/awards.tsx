import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useFocusEffect, useScrollToTop } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPublicPlayer, type Title } from '@/api/profileApi';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { AwardBadgeFor, AwardGrid } from '@/components/awards/AwardGrid';
import { AwardSheet } from '@/components/awards/AwardSheet';
import { TAB_BAR_SPACE } from '@/components/navigation/TabBar';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, metals, radius, space } from '@/constants/theme';
import { allSports } from '@/lib/profileView';
import { buildAwards, lockedHonours, type Award } from '@/lib/awardsView';
import type { Honor } from '@/lib/badges';
import { useCareer } from '@/lib/useCareer';
import { useAppSelector } from '@/store/hooks';

/** Awards tab (mocks 1g, 4d): grouped by source, earned first, one shining badge. */
export default function Awards() {
  const user = useAppSelector((s) => s.auth.user);
  const meId = user?._id ?? '';
  const insets = useSafeAreaInsets();
  const career = useCareer(user?._id);
  const [record, setRecord] = useState<{ titles: Title[]; honors: Honor[] } | null>(null);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Award | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  useScrollToTop(scroll);

  const seen = useRef(false);
  const reloadCareer = career.reload;
  const load = useCallback(async () => {
    if (!meId) return;
    setFailed(false);
    const [pub, kos] = await Promise.all([getPublicPlayer(meId), listMyQuickKnockouts().catch(() => null)]);
    if (pub) setRecord({ titles: pub.player.titles ?? [], honors: pub.player.honors ?? [] });
    else setFailed(true);
    if (kos) setKnockouts(kos);
  }, [meId]);
  useFocusEffect(
    useCallback(() => {
      load();
      if (seen.current) reloadCareer();
      seen.current = true;
    }, [load, reloadCareer]),
  );

  const ready = record && career.profile;
  const played = career.profile?.sports ?? [];
  const t = allSports(played);
  const totals = { played: t.played, won: t.won, sports: played.filter((x) => x.played > 0).length };
  const a = ready ? buildAwards({ titles: record.titles, honors: record.honors, achievements: career.profile!.achievements, knockouts, totals }) : null;
  const honours = a ? [...a.honours, ...a.knockouts] : [];
  const anyMilestone = a?.milestones.some((m) => m.earned);

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 28 }}>
        <View style={s.header}>
          <Text style={display(40)}>Awards</Text>
          {a ? <Text style={s.count}>{`${a.earned} earned`}</Text> : null}
        </View>

        {(failed || career.error) && !a ? <InlineError what="Couldn't load your awards." onRetry={() => { load(); career.reload(); }} /> : null}

        {!a && !failed && !career.error ? (
          <View style={{ paddingTop: 28, paddingHorizontal: space.gutter, gap: 18 }}>
            <Skeleton style={{ height: 152, borderRadius: radius.cardLg }} />
            <Skeleton style={{ width: '40%', height: 18 }} />
            <View style={{ flexDirection: 'row', gap: 20 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 84, height: 84, borderRadius: 42 }} />)}
            </View>
          </View>
        ) : null}

        {a?.featured ? (
          <Tap scale={0.98} accessibilityLabel={`${a.featured.label}: ${a.featured.award.name}`} onPress={() => setOpen(a.featured!.award)} style={s.featured}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <RadialGradient id="featGlow" cx="50%" cy="32%" r="75%" fx="50%" fy="32%">
                  <Stop offset="0" stopColor={metals[a.featured.award.metal].enamel[0]} />
                  <Stop offset="1" stopColor={colors.glowOut} />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#featGlow)" />
            </Svg>
            <AwardBadgeFor award={a.featured.award} size={176} shine />
            <Text style={[s.featLabel, { color: a.featured.award.earned ? metals[a.featured.award.metal].light : colors.text3 }]}>{a.featured.label}</Text>
            <Text style={[display(30), { textAlign: 'center' }]}>{a.featured.award.name}</Text>
            <Text style={s.featLine}>{a.featured.award.earned ? a.featured.award.context : a.featured.award.description}</Text>
          </Tap>
        ) : null}

        {a && honours.length ? (
          <Section title="Honours" sub="Given by organisers, or won in a quick knockout">
            <AwardGrid items={honours} size={88} columns={3} onOpen={setOpen} />
          </Section>
        ) : null}

        {a && a.milestones.length ? (
          <Section title="Career milestones" sub="Counted from every match you play">
            {anyMilestone ? (
              <View style={{ marginHorizontal: 14 - space.gutter }}><AwardGrid items={a.milestones} size={72} columns={4} onOpen={setOpen} /></View>
            ) : (
              <View>
                {a.milestones.map((m) => (
                  <Tap key={m.key} scale={0.99} accessibilityLabel={`${m.name}, ${m.context}`} onPress={() => setOpen(m)} style={s.mileRow}>
                    <AwardBadgeFor award={m} size={52} />
                    <Text style={s.mileName}>{m.name}</Text>
                    <Text style={s.mileCtx}>{m.context}</Text>
                  </Tap>
                ))}
              </View>
            )}
          </Section>
        ) : null}

        {a && !honours.length ? (
          <Section title="Honours you can earn" sub="Organisers give these at tournaments. Winning a quick knockout earns the bronze one.">
            <AwardGrid items={lockedHonours()} size={72} columns={3} onOpen={setOpen} />
          </Section>
        ) : null}

        {a && a.titles.length ? (
          <Section title="Titles">
            <View>
              {a.titles.map((t) => (
                <Tap key={t.key} scale={0.99} accessibilityLabel={`${t.name}, ${t.context}`} onPress={() => setOpen(t)} style={s.titleRow}>
                  <AwardBadgeFor award={t} size={44} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.titleName}>{t.name}</Text>
                    {t.context ? <Text style={s.mileCtx}>{t.context}</Text> : null}
                  </View>
                </Tap>
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>
      <AwardSheet award={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={{ gap: 4 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, paddingHorizontal: space.gutter },
  count: { fontFamily: font.regular, fontSize: 13, color: colors.text3, fontVariant: ['tabular-nums'] },
  featured: { alignItems: 'center', gap: 8, marginTop: 28, marginHorizontal: space.gutter, paddingTop: 26, paddingHorizontal: 20, paddingBottom: 24, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.glowOut },
  featLabel: { fontFamily: font.mono, fontSize: 10.5, letterSpacing: 0.84, textTransform: 'uppercase', marginTop: 6 },
  featLine: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.text3, textAlign: 'center' },
  section: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter, gap: space.headerToContent },
  sectionTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  sectionSub: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.text3 },
  mileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  mileName: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.text },
  mileCtx: { fontFamily: font.regular, fontSize: 13, color: colors.text3, fontVariant: ['tabular-nums'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line },
  titleName: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
});
