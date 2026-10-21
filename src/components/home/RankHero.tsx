import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { RecentMatch, SportSummary } from '@/api/career';
import type { RankedPlayer } from '@/api/rankings';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font } from '@/constants/theme';
import { heroFor, RANK_MIN, sportName, whenShort } from '@/lib/homeView';
import { RANKED_SPORTS } from '@/lib/sports';

const BIG = 132;

/**
 * Home's status hero (mock 1a). Opens on the most recently played sport; the
 * sport button switches between sports played, each with its rank.
 * `boards[sport]`: undefined while loading, null when it failed.
 */
export function RankHero({ sports, boards, meId, recent }: {
  sports: SportSummary[];
  boards: Record<string, RankedPlayer[] | null | undefined>;
  meId: string;
  recent: RecentMatch[];
}) {
  const [picked, setPicked] = useState<string>();
  const [sheet, setSheet] = useState(false);
  const current = sports.find((s) => s.sport === picked) ?? sports[0];
  const board = boards[current.sport];
  const loading = RANKED_SPORTS.includes(current.sport) && current.decided >= RANK_MIN && board === undefined;
  const hero = heroFor(current, board ?? null, meId);
  const now = new Date();

  return (
    <View style={s.wrap}>
      <View style={s.sportRow}>
        <Tap accessibilityLabel={`Sport: ${sportName(current.sport)}. Change`} onPress={() => setSheet(true)} style={s.sportBtn}>
          <Icon name={sportIcon(current.sport)} size={18} />
          <Text style={s.sportText}>{sportName(current.sport)}</Text>
          <Icon name="expand_more" size={20} color={colors.text3} />
        </Tap>
      </View>

      <View style={s.figures}>
        <View style={s.rateCol}>
          <Text style={display(34)}>{hero.rate}</Text>
          <Text style={s.sub}>{hero.sub}</Text>
        </View>
        {loading ? (
          <Skeleton style={{ width: 120, height: 100, borderRadius: 12 }} />
        ) : (
          <Text style={[display(BIG), s.big]} numberOfLines={1} adjustsFontSizeToFit>{hero.big}</Text>
        )}
      </View>

      <Tap scale={0.99} accessibilityLabel="Open rankings" onPress={() => router.push({ pathname: '/(tabs)/compete', params: { sport: current.sport } })} style={s.gapRow}>
        {loading ? (
          <Skeleton style={{ width: 180, height: 14 }} />
        ) : (
          <Text style={s.gapText} numberOfLines={1}>
            <Text style={s.gapLead}>{hero.gapA}</Text>
            {hero.gapB}
          </Text>
        )}
        <View style={s.link}>
          <Text style={s.linkText}>Rankings</Text>
          <Icon name="chevron_right" size={18} color={colors.text3} />
        </View>
      </Tap>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Show ranking for" subtitle="Only sports you've played · most recent first">
        <View>
          {sports.map((sp) => {
            const on = sp.sport === current.sport;
            const label = heroFor(sp, boards[sp.sport] ?? null, meId);
            const last = recent.find((r) => r.sport === sp.sport);
            return (
              <Tap
                key={sp.sport}
                scale={0.98}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setPicked(sp.sport);
                  setSheet(false);
                }}
                style={s.option}
              >
                <View style={s.optionIcon}><Icon name={sportIcon(sp.sport)} size={22} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.optionName}>{sportName(sp.sport)}</Text>
                  <Text style={s.sub}>{`${sp.played} played${last ? ` · last ${whenShort(last.playedAt, now)}` : ''}`}</Text>
                </View>
                <Text style={[display(20), { color: !label.ranked ? colors.text4 : on ? colors.accent : colors.text }]}>{label.rankLabel}</Text>
                <View style={{ opacity: on ? 1 : 0 }}><Icon name="check" size={20} color={colors.accent} /></View>
              </Tap>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingTop: 22, paddingHorizontal: 20, gap: 12 },
  sportRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  sportBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 12, paddingRight: 10, borderRadius: 12, backgroundColor: colors.surface1 },
  sportText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  figures: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18 },
  rateCol: { gap: 6, paddingBottom: 4, flexShrink: 0 },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.text3, fontVariant: ['tabular-nums'] },
  // The mock's .78 leading puts the numeral's bottom near its baseline; the
  // 0.9 floor leaves descent space under it, taken back here.
  big: { flexShrink: 1, textAlign: 'right', letterSpacing: -0.02 * BIG, marginBottom: -0.12 * BIG },
  gapRow: { marginTop: 6, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  gapText: { flexShrink: 1, fontFamily: font.regular, fontSize: 14, color: colors.text },
  gapLead: { fontFamily: font.semibold, color: colors.accent },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.cardLine },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
});
