import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AwardBadge } from '@/components/AwardBadge';
import { SectionHead } from '@/components/knockout/People';
import { FooterBar, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, display, font, radius, space } from '@/constants/theme';
import { HONOUR_BADGES } from '@/lib/awardsView';
import { initials } from '@/lib/matchCard';
import { goBack } from '@/lib/nav';
import { awardBadges, awardablePlayers, isKnockoutHost } from '@/lib/quickKnockoutView';
import { useQuickKnockout } from '@/lib/useQuickKnockout';
import { useAppSelector } from '@/store/hooks';

const MAX_AWARDS = 3;

/** Preview K8: host only, once the knockout is finished. The server checks every rule again. */
export default function KnockoutAwardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAppSelector((s) => s.auth.user);
  const meId = user?._id ?? '';
  const ko = useQuickKnockout(id);
  const k = ko.knockout;
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);

  const host = k ? isKnockoutHost(k, meId) : false;
  const canGive = !!k && host && k.status === 'completed' && k.awardsEligible && k.awards.length < MAX_AWARDS;
  const done = () => router.dismissTo({ pathname: '/knockout/[id]', params: { id } });
  const give = async () => {
    if (playerId && badge && (await ko.award(playerId, badge))) {
      setPlayerId(null);
      setBadge(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar title="Give awards" onBack={() => goBack(router, '/(tabs)/compete')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 32 }}>
        {ko.loading && !k ? (
          <View style={{ gap: 12, paddingTop: 18 }}>
            <Skeleton style={{ width: '55%', height: 34 }} />
            <Skeleton style={{ height: 120, borderRadius: radius.card }} />
          </View>
        ) : null}
        {ko.error && !k ? <InlineError what="Couldn't load this knockout." onRetry={ko.reload} /> : null}

        {k ? (
          <>
            <View style={{ paddingTop: 18, gap: 10 }}>
              <Text style={display(40)}>{k.name}</Text>
              <Text style={s.line}>
                {!host ? 'Only the host gives awards.'
                  : !k.awardsEligible ? 'Awards need at least 4 Kria players in the knockout.'
                    : k.awards.length >= MAX_AWARDS ? `All ${MAX_AWARDS} awards given.`
                    : `Up to ${MAX_AWARDS} awards, for Kria players in this knockout. Each one lands on their Awards.`}
              </Text>
            </View>

            {k.awards.length ? (
              <View style={s.section}>
                <SectionHead title="Given" meta={`${k.awards.length} of ${MAX_AWARDS}`} />
                {k.awards.map((a, i) => (
                  <View key={`${a.playerId}-${a.badge}-${i}`} style={s.given}>
                    <AwardBadge shape="rosette" metal="gold" size={40} glyph={HONOUR_BADGES[a.badge]?.glyph ?? 'H'} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={s.name}>{k.players.find((p) => p.playerId === a.playerId)?.displayName ?? 'Player'}</Text>
                      <Text style={s.sub}>{a.title}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {canGive ? (
              <>
                <View style={[s.section, { marginTop: 32 }]}>
                  <SectionHead title="Who gets it?" />
                  <View style={{ gap: 8 }}>
                    {/* Kria players only, never the host: the server's own rule. */}
                    {awardablePlayers(k, meId).map((p) => {
                      const on = playerId === p.playerId;
                      return (
                        <Pressable key={p.playerKey} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPlayerId(p.playerId!)} style={[s.opt, on && s.on]}>
                          <View style={s.av}><Text style={s.ini}>{initials(p.displayName)}</Text></View>
                          <Text style={[s.name, { flex: 1 }]}>{p.displayName}</Text>
                          <View style={[s.radio, on ? { borderWidth: 7, borderColor: colors.accent } : null]} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <View style={[s.section, { marginTop: 32 }]}>
                  <SectionHead title="Which award?" />
                  <View style={s.grid}>
                    {awardBadges(k).map(([key, label]) => {
                      const on = badge === key;
                      return (
                        <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => setBadge(key)} style={[s.award, on && s.on]}>
                          <AwardBadge shape="rosette" metal="gold" size={64} glyph={HONOUR_BADGES[key]?.glyph ?? 'H'} />
                          <Text style={s.awardName}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {k && host ? (
        <FooterBar>
          <View style={{ flex: 1, gap: 10 }}>
            {/* A refused award says why next to the button that was refused. */}
            {ko.problem ? <Text style={s.problem}>{ko.problem}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="secondary" label={k.awards.length || !canGive ? 'Done' : 'Skip'} onPress={done} style={{ flex: 1 }} />
              {canGive ? <Button label="Give award" busy={ko.busy} busyLabel="Giving" disabled={!playerId || !badge} onPress={give} style={{ flex: 1.3 }} /> : null}
            </View>
          </View>
        </FooterBar>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  line: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3 },
  section: { marginTop: 28 },
  given: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  opt: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: radius.input, backgroundColor: colors.surface1, borderWidth: 1.5, borderColor: 'transparent' },
  on: { borderColor: colors.accent },
  av: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  ini: { fontFamily: font.semibold, fontSize: 11, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.ring },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  award: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 14, paddingHorizontal: 10, borderRadius: 18, backgroundColor: colors.surface1, borderWidth: 1.5, borderColor: 'transparent' },
  awardName: { fontFamily: font.semibold, fontSize: 13, color: colors.text, textAlign: 'center' },
  problem: { fontFamily: font.regular, fontSize: 13, color: colors.error, textAlign: 'center' },
});
