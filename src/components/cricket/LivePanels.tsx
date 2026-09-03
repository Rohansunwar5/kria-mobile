import { View, Text, ScrollView } from 'react-native';
import { CricketMatch, InningsScorecard, LiveState, PartnershipInfo, TeamLineup } from '@/api/cricketMatch';
import {
  ballChipKind,
  ballsRemaining,
  currentRunRate,
  matchStateNote,
  projectedScore,
  requiredRunRate,
  strikeRate,
  tossLine,
  yetToBat,
  type BallKind,
} from '@/lib/cricketView';
import { Lbl } from '@/components/canvas';
import { Icon } from '@/components/icons';

// Everything the web client shows in its sidebar, translated to the canvas
// tokens: toss, current partnership, run rates, the first-innings reference
// during a chase, the per-over timeline and the "why has this stopped" states.

const BALL: Record<BallKind, { bg: string; fg: string; border?: string }> = {
  six: { bg: '#FA4C93', fg: '#240614' },
  four: { bg: '#16C46A', fg: '#06240F' },
  wicket: { bg: '#FF4438', fg: '#2A0703' },
  extra: { bg: 'rgba(255,255,255,0.07)', fg: '#F97316', border: 'rgba(255,255,255,0.12)' },
  dot: { bg: 'rgba(255,255,255,0.07)', fg: '#7d7d7d', border: 'rgba(255,255,255,0.12)' },
  run: { bg: 'rgba(255,255,255,0.07)', fg: '#d4d4d4', border: 'rgba(255,255,255,0.12)' },
};

function Block({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

function Band({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
      <Lbl style={{ letterSpacing: 0.16 * 9 }}>{title}</Lbl>
      {aside ? <Lbl style={{ letterSpacing: 0.12 * 9, color: '#a3a3a3' }}>{aside}</Lbl> : null}
    </View>
  );
}

/** One line, above the fold: who won the toss and what they did. */
export function TossLine({ match }: { match: CricketMatch | null }) {
  const line = tossLine(match);
  if (!line) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: 'rgba(249,115,22,0.10)', borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.30)', borderRadius: 6 }}>
      <Icon name="flame" size={13} color="#F97316" strokeWidth={2.2} />
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: '#d4d4d4' }}>
        {line}
      </Text>
    </View>
  );
}

/** The scoreboard has stopped for a reason — name it. */
export function MatchStateBanner({ live }: { live: LiveState | null }) {
  const note = matchStateNote(live);
  if (!note) return null;
  return (
    <Block>
      <View style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F97316' }}>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.16 * 9, textTransform: 'uppercase', color: '#0B0B0B' }}>
          {note.title}
        </Text>
      </View>
      <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#d4d4d4', padding: 12 }}>
        {note.message}
      </Text>
    </Block>
  );
}

/** The pair at the crease, straight from `currentPartnership`. */
export function PartnershipCard({ partnership }: { partnership: PartnershipInfo | null }) {
  if (!partnership || partnership.balls === 0) return null;
  // 80 is a generous stand in a T20 — the bar is a feel, not a scale.
  const pct = Math.min(100, (partnership.runs / 80) * 100);

  return (
    <Block>
      <Band title="Current partnership" aside={`SR ${strikeRate(partnership.runs, partnership.balls).toFixed(1)}`} />
      <View style={{ padding: 13, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Text numberOfLines={2} style={{ flex: 1, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, lineHeight: 18, color: '#fff' }}>
            {partnership.strikerName} <Text style={{ color: '#7d7d7d' }}>/</Text> {partnership.nonStrikerName}
          </Text>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 26, lineHeight: 26, color: '#fff' }}>
            {partnership.runs}
            <Text style={{ fontSize: 14, color: '#a3a3a3' }}> ({partnership.balls})</Text>
          </Text>
        </View>
        <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <View style={{ width: `${pct}%`, height: 5, backgroundColor: '#F97316' }} />
        </View>
      </View>
    </Block>
  );
}

/** CRR, RRR, balls left and a projection — the four numbers that decide
 *  whether a chase is on. */
export function RunRatePanel({ live, maxOvers }: { live: LiveState | null; maxOvers?: number }) {
  if (!live) return null;
  const crr = currentRunRate(live);
  const rrr = requiredRunRate(live, maxOvers);
  const left = ballsRemaining(live, maxOvers);
  const projected = projectedScore(live, maxOvers);
  const pressure = rrr != null && crr > 0 && rrr > crr * 1.3;

  const cells: { label: string; value: string; tone: string; bar?: number }[] = [
    { label: 'Current RR', value: crr.toFixed(2), tone: '#fff', bar: Math.min(1, crr / 15) },
    ...(rrr != null
      ? [{ label: 'Required RR', value: rrr.toFixed(2), tone: pressure ? '#FF4438' : '#16C46A', bar: Math.min(1, rrr / 15) }]
      : projected != null
        ? [{ label: 'Projected', value: String(projected), tone: '#F97316' }]
        : []),
    ...(left != null ? [{ label: 'Balls left', value: String(left), tone: '#fff' }] : []),
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {cells.map((c) => (
        <View
          key={c.label}
          style={{
            flex: 1,
            backgroundColor: '#151515',
            borderWidth: 1.5,
            borderColor: c.tone === '#FF4438' ? 'rgba(255,68,56,0.45)' : 'rgba(255,255,255,0.14)',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <Lbl style={{ letterSpacing: 0.12 * 9 }}>{c.label}</Lbl>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 22, color: c.tone, marginTop: 4 }}>{c.value}</Text>
          {c.bar != null ? (
            <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 8 }}>
              <View style={{ width: `${c.bar * 100}%`, height: 3, backgroundColor: c.tone === '#FF4438' ? '#FF4438' : '#F97316' }} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** The score being chased. Prefers the full first-innings card, falls back to
 *  `live.innings1Summary` when the scorecard has not landed yet. */
export function Innings1Panel({
  innings1,
  live,
}: {
  innings1: InningsScorecard | null;
  live: LiveState | null;
}) {
  if ((live?.currentInnings ?? 1) !== 2) return null;
  const summary = live?.innings1Summary;
  const runs = innings1?.totals.runs ?? summary?.runs;
  if (runs == null) return null;
  const wickets = innings1?.totals.wickets ?? summary?.wickets ?? 0;
  const overs = innings1?.totals.overs ?? `${summary?.completedOvers ?? 0}.${summary?.ballsInCurrentOver ?? 0}`;

  return (
    <Block>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 11 }}>
        <View style={{ flex: 1 }}>
          <Lbl style={{ letterSpacing: 0.14 * 9 }}>1st innings</Lbl>
          <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#d4d4d4', marginTop: 3 }}>
            {innings1?.battingTeamName || 'Batted first'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 22, lineHeight: 22, color: '#fff' }}>
            {runs}/{wickets}
          </Text>
          <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, color: '#a3a3a3', marginTop: 3 }}>{overs} ov</Text>
        </View>
      </View>
    </Block>
  );
}

/** Per-over rows — over number, every ball, the over total. The last six
 *  overs, newest at the bottom, like the web client. */
export function OversTimeline({ innings }: { innings: InningsScorecard | null }) {
  const overs = (innings?.oversTimeline ?? []).slice(-6);
  if (overs.length === 0) return null;

  return (
    <Block>
      <Band title="Over by over" aside={`Last ${overs.length}`} />
      <View style={{ padding: 12, gap: 11 }}>
        {overs.map((over) => (
          <View key={over.overNumber} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ width: 20, fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#7d7d7d' }}>{over.overNumber}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }} style={{ flex: 1 }}>
              {over.balls.map((b, i) => {
                const skin = BALL[ballChipKind(b)];
                return (
                  <View
                    key={i}
                    style={{
                      minWidth: 26,
                      height: 26,
                      paddingHorizontal: 4,
                      borderRadius: 4,
                      backgroundColor: skin.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(skin.border ? { borderWidth: 1.5, borderColor: skin.border } : null),
                    }}
                  >
                    <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: b.label.length > 1 ? 9 : 11, color: skin.fg }}>
                      {b.label}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <Text style={{ width: 42, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff' }}>
              {over.runs}
              {over.wickets > 0 ? <Text style={{ color: '#FF4438' }}>{`·${over.wickets}w`}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
    </Block>
  );
}

/** Fall of wickets, including the stand each wicket ended. */
export function FallOfWickets({ innings }: { innings: InningsScorecard | null }) {
  const list = innings?.fallOfWickets ?? [];
  if (list.length === 0) return null;

  return (
    <Block>
      <Band title="Fall of wickets" aside={`${list.length} down`} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 13, paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}>
        <Lbl style={{ width: 18, letterSpacing: 0.1 * 9 }}>#</Lbl>
        <Lbl style={{ flex: 1, letterSpacing: 0.12 * 9 }}>Batter</Lbl>
        <Lbl style={{ width: 52, textAlign: 'right', letterSpacing: 0.1 * 9 }}>Score</Lbl>
        <Lbl style={{ width: 40, textAlign: 'right', letterSpacing: 0.1 * 9 }}>Ov</Lbl>
        <Lbl style={{ width: 52, textAlign: 'right', letterSpacing: 0.1 * 9 }}>Stand</Lbl>
      </View>
      {list.map((f) => (
        <View
          key={f.wicketNumber}
          style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 13, paddingVertical: 9, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={{ width: 18, fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: '#7d7d7d' }}>{f.wicketNumber}</Text>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: '#d4d4d4' }}>{f.batterName}</Text>
            <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.06 * 8, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
              {f.dismissalLine}
            </Text>
          </View>
          <Text style={{ width: 52, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff' }}>
            {f.score}
            <Text style={{ color: '#7d7d7d' }}>/{f.wicketNumber}</Text>
          </Text>
          <Text style={{ width: 40, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#a3a3a3' }}>{f.overs}</Text>
          <Text style={{ width: 52, textAlign: 'right', fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: '#a3a3a3' }}>
            {f.partnershipRuns}
            <Text style={{ fontSize: 8, color: '#7d7d7d' }}> ({f.partnershipBalls})</Text>
          </Text>
        </View>
      ))}
    </Block>
  );
}

function XI({ lineup, teamName, innings }: { lineup?: TeamLineup; teamName: string; innings: InningsScorecard | null }) {
  if (!lineup?.lineupSet) return null;
  const pending = yetToBat(lineup, innings);
  const pendingSet = new Set(pending);

  return (
    <Block>
      <Band title={teamName} aside={pending.length ? `${pending.length} yet to bat` : undefined} />
      {(lineup.startingXI ?? []).map((p, i) => (
        <View
          key={p.registrationId}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={{ width: 16, textAlign: 'right', fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#5c5c5c' }}>{i + 1}</Text>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: '#d4d4d4' }}>
            {p.name || 'Unnamed'}
          </Text>
          {p.name && pendingSet.has(p.name) ? <Lbl style={{ fontSize: 8, letterSpacing: 0.12 * 8 }}>Yet to bat</Lbl> : null}
        </View>
      ))}
      {(lineup.reserves ?? []).length > 0 ? (
        <>
          <View style={{ paddingHorizontal: 13, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.03)', borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)' }}>
            <Lbl style={{ fontSize: 8, letterSpacing: 0.12 * 8 }}>Reserves</Lbl>
          </View>
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 18, color: '#7d7d7d', paddingHorizontal: 13, paddingVertical: 9 }}>
            {(lineup.reserves ?? []).map((r) => r.name || 'Unnamed').join(' · ')}
          </Text>
        </>
      ) : null}
    </Block>
  );
}

/** Both XIs, with yet-to-bat marked for whichever side is batting. */
export function Lineups({
  match,
  currentInnings,
}: {
  match: CricketMatch | null;
  currentInnings: InningsScorecard | null;
}) {
  const setup = match?.cricketSetup;
  if (!setup?.team1Lineup?.lineupSet && !setup?.team2Lineup?.lineupSet) return null;
  const battingId = currentInnings?.battingTeamId;

  return (
    <View style={{ gap: 12 }}>
      <XI
        lineup={setup.team1Lineup}
        teamName={match?.teams?.team1Name || 'Team 1'}
        innings={String(setup.team1Lineup?.teamId) === String(battingId) ? currentInnings : null}
      />
      <XI
        lineup={setup.team2Lineup}
        teamName={match?.teams?.team2Name || 'Team 2'}
        innings={String(setup.team2Lineup?.teamId) === String(battingId) ? currentInnings : null}
      />
    </View>
  );
}
