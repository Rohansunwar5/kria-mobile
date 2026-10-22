import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Crest } from '@/components/tournament/Crest';
import { Segmented } from '@/components/ui/Segmented';
import { colors, display, font } from '@/constants/theme';
import type { Chip, CricketBoardView } from '@/lib/cricketBoard';

type Tab = CricketBoardView['defaultTab'];
const TABS: { key: Tab; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'card', label: 'Scorecard' },
  { key: 'overs', label: 'Overs' },
];

const SKIN: Record<Chip['kind'], { bg: string; fg: string }> = {
  wicket: { bg: colors.accent, fg: colors.onAccent },
  boundary: { bg: colors.text, fg: colors.bg },
  extra: { bg: colors.lineStrong, fg: colors.text2 },
  run: { bg: colors.surface2, fg: colors.text },
};

function Chips({ chips, size = 34, empty = 0 }: { chips: Chip[]; size?: number; empty?: number }) {
  const small = size < 30;
  return (
    <View style={s.chips}>
      {chips.map((c, i) => (
        <View key={i} style={[s.chip, small && s.chipSm, { minWidth: size, height: size, backgroundColor: SKIN[c.kind].bg }]}>
          <Text style={[s.chipText, small && { fontSize: 11 }, { color: SKIN[c.kind].fg }]}>{c.label}</Text>
        </View>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <View key={`e${i}`} style={[s.chip, { width: size, height: size, borderWidth: 1, borderColor: colors.lineStrong }]} />
      ))}
    </View>
  );
}

function Head({ cols, widths }: { cols: string[]; widths: number[] }) {
  return (
    <View style={s.tr}>
      <Text style={[s.th, s.flex]}>{cols[0]}</Text>
      {cols.slice(1).map((c, i) => <Text key={c} style={[s.th, s.num, { width: widths[i] }]}>{c}</Text>)}
    </View>
  );
}

/** Mock 3c. Hero card plus Live / Scorecard / Overs; `extra` sits under the hero (host tools). */
export function CricketBoard({ view, extra, crests = true }: { view: CricketBoardView; extra?: React.ReactNode; crests?: boolean }) {
  const [tab, setTab] = useState<Tab>(view.defaultTab);
  const [inn, setInn] = useState<1 | 2 | null>(null);
  const { hero, live, waiting } = view;
  const line = hero.line;
  const curInn = view.innings.find((i) => i.key === inn) ?? view.innings[view.innings.length - 1];
  const max = view.overs.max;
  const crowded = view.overs.bars.length > 12;

  return (
    <View>
      <View style={s.card}>
        {hero.rows.map((r, i) => !r.score && hero.rows.some((x) => x.score) ? null : (
          <View key={r.side.id} style={s.heroRow}>
            {crests ? <View testID="hero-crest"><Crest uri={r.side.crest} name={r.side.name} size={32} /></View> : null}
            <Text style={[r.big ? s.nameBig : s.name, s.flex]} numberOfLines={1}>{r.side.name}</Text>
            {r.score ? (
              <View style={s.score}>
                <Text style={r.big ? display(44) : s.scoreSm}>{r.score}</Text>
                {hero.overs[i] ? <Text style={s.overs}>{hero.overs[i]}</Text> : null}
              </View>
            ) : null}
          </View>
        ))}
        {line ? <View style={s.rule} /> : null}
        {line?.kind === 'chase' ? (
          <View style={s.chase}>
            <View style={s.gap2}>
              <Text style={s.small}>To win</Text>
              <View style={s.need}>
                <Text style={display(28)}>Need</Text>
                <Text style={[display(28), { color: colors.accent }]}>{line.need}</Text>
                <Text style={display(28)}>{`off ${line.balls}`}</Text>
              </View>
            </View>
            <View style={s.rates}>
              <View style={s.rate}><Text style={s.small}>Req. rate</Text><Text style={s.rateV}>{line.req}</Text></View>
              <View style={s.rate}><Text style={s.small}>Current</Text><Text style={s.rateV}>{line.cur}</Text></View>
            </View>
          </View>
        ) : line ? (
          <Text style={s.lineText}>{line.text}</Text>
        ) : null}
      </View>
      {extra}

      {waiting ? (
        <View style={s.waiting}>
          {waiting.toss ? <Text style={s.small}>{waiting.toss}</Text> : null}
          <Text style={s.waitLine}>{waiting.line}</Text>
          {waiting.squads.map((sq, i) =>
            sq.length ? (
              <View key={i} style={s.gap6}>
                <Text style={s.h}>{hero.rows[i].side.name}</Text>
                <Text style={s.fow}>{sq.join(' · ')}</Text>
              </View>
            ) : null
          )}
        </View>
      ) : (
        <>
          <View style={s.tabs} accessibilityRole="tablist">
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.key }}
                onPress={() => setTab(t.key)}
                style={[s.tab, tab === t.key && s.tabOn]}
              >
                <Text style={[s.tabText, { color: tab === t.key ? colors.text : colors.text3 }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'live' && live ? (
            <View style={s.panel}>
              {live.batters.length ? (
                <View>
                  <Head cols={['Batting', 'R', 'B', '4s', '6s', 'SR']} widths={[34, 30, 26, 26, 44]} />
                  {live.batters.map((b) => (
                    <View key={b.name} style={[s.tr, s.rowLine]}>
                      <Text style={[s.bName, s.flex]} numberOfLines={1}>{b.name}{b.striker ? '*' : ''}</Text>
                      <Text style={[display(18), s.num, { width: 34 }]}>{b.r}</Text>
                      <Text style={[s.td, s.num, { width: 30, color: colors.text2 }]}>{b.b}</Text>
                      <Text style={[s.td, s.num, { width: 26 }]}>{b.f}</Text>
                      <Text style={[s.td, s.num, { width: 26 }]}>{b.s}</Text>
                      <Text style={[s.td, s.num, { width: 44 }]}>{b.sr}</Text>
                    </View>
                  ))}
                  {live.partnership ? <Text style={s.partner}>{live.partnership}</Text> : null}
                </View>
              ) : null}
              {live.bowler ? (
                <View>
                  <Head cols={['Bowling', 'O', 'M', 'R', 'W', 'Econ']} widths={[34, 26, 30, 26, 44]} />
                  <View style={[s.tr, s.rowLine]}>
                    <Text style={[s.bName, s.flex]} numberOfLines={1}>{live.bowler.name}</Text>
                    <Text style={[s.td, s.num, { width: 34, color: colors.text }]}>{live.bowler.o}</Text>
                    <Text style={[s.td, s.num, { width: 26 }]}>{live.bowler.m}</Text>
                    <Text style={[s.td, s.num, { width: 30, color: colors.text }]}>{live.bowler.r}</Text>
                    <Text style={[display(18), s.num, { width: 26 }]}>{live.bowler.w}</Text>
                    <Text style={[s.td, s.num, { width: 44 }]}>{live.bowler.e}</Text>
                  </View>
                </View>
              ) : null}
              {live.thisOver ? (
                <View style={s.gap10}>
                  <View style={s.between}>
                    <Text style={s.h2}>This over</Text>
                    <Text style={s.small}>{`${live.thisOver.runs} runs`}</Text>
                  </View>
                  <Chips chips={live.thisOver.chips} empty={live.thisOver.empty} />
                </View>
              ) : null}
              {live.lastOver || live.toss ? (
                <View style={s.foot}>
                  {live.lastOver ? <Text style={s.footText}>{`Last over: ${live.lastOver}`}</Text> : null}
                  {live.toss ? <Text style={s.footText}>{live.toss}</Text> : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {tab === 'card' ? (
            <View style={s.panel}>
              {view.innings.length > 1 ? (
                <Segmented<'1' | '2'>
                  options={view.innings.map((i) => ({ key: String(i.key) as '1' | '2', label: i.label }))}
                  value={String(curInn.key) as '1' | '2'}
                  onChange={(k) => setInn(Number(k) as 1 | 2)}
                />
              ) : null}
              {curInn ? (
                <>
                  <View>
                    <Head cols={['Batter', 'R', 'B', 'SR']} widths={[34, 30, 44]} />
                    {curInn.batting.map((b, i) => (
                      <View key={i} style={[s.tr, s.rowLine]}>
                        <View style={[s.flex, s.gap2]}>
                          <Text style={s.bName} numberOfLines={1}>{b.name}</Text>
                          <Text style={[s.how, b.notOut && { color: colors.accent }]}>{b.how}</Text>
                        </View>
                        <Text style={[display(17), s.num, { width: 34 }]}>{b.r}</Text>
                        <Text style={[s.td, s.num, { width: 30, color: colors.text2 }]}>{b.b}</Text>
                        <Text style={[s.td, s.num, { width: 44 }]}>{b.sr}</Text>
                      </View>
                    ))}
                    <View style={[s.tr, s.rowLine, s.between]}>
                      <Text style={s.small}>{curInn.extras}</Text>
                      <Text style={s.totalV}>{curInn.total}</Text>
                    </View>
                  </View>
                  <View>
                    <Head cols={['Bowler', 'O', 'R', 'W', 'Econ']} widths={[34, 30, 26, 44]} />
                    {curInn.bowling.map((b, i) => (
                      <View key={i} style={[s.tr, s.rowLine]}>
                        <Text style={[s.bName, s.flex]} numberOfLines={1}>{b.name}</Text>
                        <Text style={[s.td, s.num, { width: 34, color: colors.text }]}>{b.o}</Text>
                        <Text style={[s.td, s.num, { width: 30, color: colors.text }]}>{b.r}</Text>
                        <Text style={[display(17), s.num, { width: 26 }]}>{b.w}</Text>
                        <Text style={[s.td, s.num, { width: 44 }]}>{b.e}</Text>
                      </View>
                    ))}
                  </View>
                  {curInn.fow ? (
                    <View style={s.gap6}>
                      <Text style={s.h2}>Fall of wickets</Text>
                      <Text style={s.fow}>{curInn.fow}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {tab === 'overs' ? (
            <View style={[s.panel, { gap: 18 }]}>
              <View style={s.between}>
                <Text style={s.h2}>Runs per over</Text>
                <View style={s.legend}>
                  {view.legend.map((n, i) => (
                    <View key={n} style={s.legendItem}>
                      <View style={[s.swatch, { backgroundColor: i === 0 ? colors.ring : colors.text }]} />
                      <Text style={s.small}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.plot}>
                {view.overs.bars.map((b) => (
                  <View key={b.n} style={s.col}>
                    <View style={[s.bar, { height: (b.a / max) * 160, backgroundColor: colors.ring }]} />
                    <View
                      style={[
                        s.bar,
                        { height: ((b.b ?? 0) / max) * 160, backgroundColor: b.current ? colors.accent : colors.text },
                        b.wicketB && { borderWidth: 1.5, borderColor: colors.accent },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={s.axis}>
                {view.overs.bars.map((b) => <Text key={b.n} style={[s.axisN, crowded && { fontSize: 8 }]}>{b.n}</Text>)}
              </View>
              <Text style={s.small}>A ring marks an over with a wicket. The over in progress is in orange.</Text>
              <View>
                {view.overs.list.map((o, k) => (
                  <View key={`${o.innings}-${o.n}`}>
                    {k === 0 || view.overs.list[k - 1].innings !== o.innings ? (
                      <Text style={s.inningsLabel}>{o.innings === 1 ? '1st innings' : '2nd innings'}</Text>
                    ) : null}
                    <View style={[s.overRow, s.rowLine]}>
                      <Text style={s.overN}>{`Over ${o.n}`}</Text>
                      <View style={s.flex}><Chips chips={o.chips} size={24} /></View>
                      <Text style={s.overRuns}>{o.runs}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  gap2: { gap: 2 },
  gap6: { gap: 6 },
  gap10: { gap: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  card: { marginTop: 8, borderRadius: 26, backgroundColor: colors.surface1, padding: 20, gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.text2 },
  nameBig: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreSm: { fontFamily: font.regular, fontSize: 16, color: colors.text2, fontVariant: ['tabular-nums'] },
  overs: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  rule: { height: 1, backgroundColor: colors.cardLine },
  chase: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  need: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rates: { flexDirection: 'row', gap: 14 },
  rate: { alignItems: 'flex-end', gap: 2 },
  rateV: { fontFamily: font.bold, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  lineText: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  small: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  waiting: { paddingTop: 28, gap: 18 },
  waitLine: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  h: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  h2: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  tabs: { flexDirection: 'row', gap: 20, marginTop: 32, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.accent },
  tabText: { fontFamily: font.semibold, fontSize: 14 },
  panel: { paddingTop: 28, gap: 32 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  th: { fontFamily: font.semibold, fontSize: 11, color: colors.text4, paddingBottom: 8 },
  num: { textAlign: 'right' },
  td: { fontFamily: font.regular, fontSize: 14, color: colors.text3, fontVariant: ['tabular-nums'] },
  rowLine: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  bName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  how: { fontFamily: font.regular, fontSize: 11, color: colors.text3 },
  partner: { paddingTop: 8, fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  totalV: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  foot: { gap: 4, paddingTop: 4 },
  footText: { fontFamily: font.regular, fontSize: 12, color: colors.text4 },
  fow: { fontFamily: font.regular, fontSize: 12, lineHeight: 19, color: colors.text3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  chipSm: { borderRadius: 7, paddingHorizontal: 4 },
  chipText: { fontFamily: font.bold, fontSize: 13 },
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 170, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.cardLine },
  col: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  bar: { flex: 1, maxWidth: 9, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  axis: { flexDirection: 'row', gap: 4 },
  axisN: { flex: 1, textAlign: 'center', fontFamily: font.regular, fontSize: 10, color: colors.text4 },
  inningsLabel: { paddingTop: 14, paddingBottom: 4, fontFamily: font.semibold, fontSize: 11, color: colors.text4 },
  overRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  overN: { width: 44, fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  overRuns: { fontFamily: font.semibold, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
});
