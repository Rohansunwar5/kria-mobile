import { View, Text, ScrollView } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { InningsScorecard } from '@/api/cricketMatch';
import { manhattanBars, wormSeries, runDistribution } from '@/lib/cricketView';
import { Lbl } from '@/components/canvas';

// The web client's manhattan / worm / distribution charts, redrawn in the
// canvas palette. Bars and lines are react-native-svg (already a dependency
// for the icon set) — no chart library.

function Panel({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: '#fff' }}>{title}</Text>
        {aside ? <Lbl style={{ letterSpacing: 0.12 * 9 }}>{aside}</Lbl> : null}
      </View>
      {children}
    </View>
  );
}

/** Runs per over. Wicket overs go red, unbowled overs stay as empty slots so
 *  the axis keeps its full length. */
export function ManhattanChart({ innings, maxOvers }: { innings: InningsScorecard | null; maxOvers?: number }) {
  const { bars, peak } = manhattanBars(innings, maxOvers);
  if (bars.length === 0) return null;

  const BAR = 20;
  const GAP = 3;
  const H = 116;

  return (
    <Panel title="Runs per over" aside={`Peak ${peak}`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H, gap: GAP }}>
            {bars.map((b) => (
              <View key={b.overNumber} style={{ width: BAR, alignItems: 'center', justifyContent: 'flex-end', height: H }}>
                {!b.empty && b.runs > 0 ? (
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: '#a3a3a3', marginBottom: 2 }}>{b.runs}</Text>
                ) : null}
                <View
                  style={{
                    width: BAR,
                    height: Math.max(2, b.ratio * (H - 16)),
                    backgroundColor: b.empty ? 'rgba(255,255,255,0.04)' : b.wickets > 0 ? '#FF4438' : '#F97316',
                  }}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: GAP, marginTop: 5 }}>
            {bars.map((b) => (
              <Text
                key={b.overNumber}
                style={{ width: BAR, textAlign: 'center', fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: '#5c5c5c' }}
              >
                {b.overNumber}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </Panel>
  );
}

/** Cumulative runs by over end. Both innings on one grid, so a chase can be
 *  read against the score it is chasing. */
export function WormChart({
  innings1,
  innings2,
  maxOvers,
}: {
  innings1: InningsScorecard | null;
  innings2: InningsScorecard | null;
  maxOvers?: number;
}) {
  const { series, maxX, maxY } = wormSeries(innings1, innings2, maxOvers);
  if (series.length === 0) return null;

  const W = 340;
  const H = 200;
  const PAD = { l: 34, r: 10, t: 12, b: 26 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const px = (v: number) => PAD.l + (v / maxX) * innerW;
  const py = (v: number) => PAD.t + innerH - (v / maxY) * innerH;
  const path = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');

  const xStep = maxX <= 10 ? 2 : maxX <= 25 ? 5 : 10;
  const xTicks = Array.from({ length: Math.floor(maxX / xStep) + 1 }, (_, i) => i * xStep);
  if (xTicks[xTicks.length - 1] !== maxX) xTicks.push(maxX);

  const yStep = maxY <= 60 ? 20 : maxY <= 150 ? 50 : 100;
  const yTicks = Array.from({ length: Math.floor(maxY / yStep) + 1 }, (_, i) => i * yStep);

  return (
    <Panel title="Worm" aside="Cumulative runs">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 13, paddingTop: 10 }}>
        {series.map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, backgroundColor: s.color }} />
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 11, color: '#d4d4d4' }}>
              {s.teamName}
            </Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: '#fff' }}>{s.finalRuns}</Text>
          </View>
        ))}
      </View>
      <View style={{ padding: 10 }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {yTicks.map((v) => (
            <Line key={`y${v}`} x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          ))}
          {xTicks.map((v) => (
            <Line key={`x${v}`} x1={px(v)} x2={px(v)} y1={PAD.t} y2={PAD.t + innerH} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          ))}
          {series.map((s) => (
            <Path key={s.label} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
          ))}
          {series.map((s) =>
            s.points.map((p, i) => <Circle key={`${s.label}-${i}`} cx={px(p.x)} cy={py(p.y)} r={2.2} fill={s.color} />)
          )}
        </Svg>

        {/* Axis numerals are RN Text over the Svg, not SVG <Text> — a custom
            fontFamily inside Svg does not resolve on Android. */}
        <View style={{ position: 'absolute', left: 0, top: 10, height: H, width: PAD.l }} pointerEvents="none">
          {yTicks.map((v) => (
            <Text
              key={v}
              style={{ position: 'absolute', right: 4, top: py(v) - 5, fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: '#7d7d7d' }}
            >
              {v}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginLeft: PAD.l, marginRight: PAD.r, justifyContent: 'space-between' }}>
          {xTicks.map((v) => (
            <Text key={v} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, color: '#7d7d7d' }}>
              {v}
            </Text>
          ))}
        </View>
        <Lbl style={{ textAlign: 'center', marginTop: 4, letterSpacing: 0.12 * 9 }}>Overs</Lbl>
      </View>
    </Panel>
  );
}

/** How the innings was actually made: dots through sixes, plus wickets and
 *  extras. Derived from `oversTimeline`, no extra call. */
export function RunDistribution({ innings }: { innings: InningsScorecard | null }) {
  const { rows, totalBalls } = runDistribution(innings);
  if (totalBalls === 0) return null;
  const peak = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Panel title="Ball outcomes" aside={`${totalBalls} balls`}>
      <View style={{ padding: 13, gap: 9 }}>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Lbl style={{ width: 54, letterSpacing: 0.1 * 9 }}>{r.label}</Lbl>
            <View style={{ flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ width: `${(r.count / peak) * 100}%`, height: 10, backgroundColor: r.tone }} />
            </View>
            <Text style={{ width: 26, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff' }}>{r.count}</Text>
            <Text style={{ width: 30, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 9, color: '#7d7d7d' }}>
              {Math.round(r.share * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

/** Per-wicket stands, longest bar = biggest stand. `unbroken` goes green. */
export function PartnershipsList({ innings }: { innings: InningsScorecard | null }) {
  const list = innings?.partnerships ?? [];
  if (list.length === 0) return null;
  const peak = Math.max(1, ...list.map((p) => p.runs));

  return (
    <Panel title="Partnerships" aside={`Peak ${peak}`}>
      <View style={{ padding: 13, gap: 11 }}>
        {list.map((p) => (
          <View key={`${p.wicketNumber}-${p.batter1Id}-${p.batter2Id}`} style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#7d7d7d' }}>{p.wicketNumber}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#d4d4d4' }}>
                {p.batter1Name} / {p.batter2Name}
              </Text>
              <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#fff' }}>
                {p.runs}
                <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#a3a3a3' }}> ({p.balls})</Text>
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ width: `${(p.runs / peak) * 100}%`, height: 8, backgroundColor: p.unbroken ? '#16C46A' : '#F97316' }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
        <Lbl style={{ fontSize: 8, letterSpacing: 0.12 * 8 }}>Green bar is the stand still going</Lbl>
      </View>
    </Panel>
  );
}

export { Panel as ChartPanel };
