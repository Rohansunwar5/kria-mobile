import { useState } from 'react';
import { View, Text } from 'react-native';
import { InningsScorecard, LiveState } from '@/api/cricketMatch';
import { dismissalLine } from '@/lib/cricketView';
import { Chip, Lbl } from '@/components/canvas';
import { FallOfWickets } from '@/components/cricket/LivePanels';
import { PartnershipsList } from '@/components/cricket/CricketCharts';

// CricketLive.dc.html's scorecard: a `.blk` with a tinted header row, hairline
// dividers, mono numerals right-aligned in fixed columns. Innings and section
// are both chip switches — no underlined web tabs.

type SubTab = 'batting' | 'bowling' | 'fow' | 'stands';
const SUBS: { key: SubTab; label: string }[] = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'fow', label: 'Wickets' },
  { key: 'stands', label: 'Stands' },
];

const NUM = { fontFamily: 'SpaceMono_400Regular' as const, fontSize: 12, textAlign: 'right' as const };
const NUM_BOLD = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, textAlign: 'right' as const };

function Block({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

function Head({ first, cols }: { first: string; cols: { label: string; w: number }[] }) {
  return (
    <>
      <View style={{ flexDirection: 'row', paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Lbl style={{ flex: 1, letterSpacing: 0.12 * 9 }}>{first}</Lbl>
        {cols.map((c) => (
          <Lbl key={c.label} style={{ width: c.w, textAlign: 'right', letterSpacing: 0.1 * 9 }}>
            {c.label}
          </Lbl>
        ))}
      </View>
      <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
    </>
  );
}

function Row({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderTopWidth: 1.5,
        borderTopColor: 'rgba(255,255,255,0.06)',
        ...(active ? { backgroundColor: 'rgba(249,115,22,0.10)' } : null),
      }}
    >
      {children}
    </View>
  );
}

function BattingTable({ innings, live }: { innings: InningsScorecard; live: LiveState | null }) {
  return (
    <Block>
      <Head first="Batter" cols={[{ label: 'R', w: 30 }, { label: 'B', w: 30 }, { label: '4s', w: 28 }, { label: '6s', w: 28 }, { label: 'SR', w: 44 }]} />
      {innings.battingCard.map((b) => {
        const striker = b.registrationId === live?.strikerId;
        const active = striker || b.registrationId === live?.nonStrikerId;
        return (
          <Row key={b.registrationId} active={active}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text numberOfLines={1} style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: active ? '#fff' : '#d4d4d4' }}>
                {b.name}
                {striker ? <Text style={{ color: '#F97316' }}> ★</Text> : null}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 8, letterSpacing: 0.06 * 8, textTransform: 'uppercase', color: '#7d7d7d', marginTop: 2 }}>
                {dismissalLine(b.dismissal)}
              </Text>
            </View>
            <Text style={{ ...NUM_BOLD, width: 30, color: '#fff' }}>{b.runs}</Text>
            <Text style={{ ...NUM, width: 30, color: '#a3a3a3' }}>{b.ballsFaced}</Text>
            <Text style={{ ...NUM, width: 28, color: '#a3a3a3' }}>{b.fours}</Text>
            <Text style={{ ...NUM, width: 28, color: '#a3a3a3' }}>{b.sixes}</Text>
            <Text style={{ ...NUM, width: 44, color: '#a3a3a3' }}>{b.strikeRate.toFixed(1)}</Text>
          </Row>
        );
      })}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 9, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: '#7d7d7d' }}>
          EXTRAS {innings.totals.extras.total}
        </Text>
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff' }}>
          {innings.totals.runs}/{innings.totals.wickets}
          <Text style={{ fontFamily: 'SpaceMono_400Regular', color: '#a3a3a3' }}>{`  ${innings.totals.overs} OV`}</Text>
        </Text>
      </View>
    </Block>
  );
}

function BowlingTable({ innings, live }: { innings: InningsScorecard; live: LiveState | null }) {
  return (
    <Block>
      <Head first="Bowler" cols={[{ label: 'O', w: 34 }, { label: 'M', w: 26 }, { label: 'R', w: 30 }, { label: 'W', w: 26 }, { label: 'Econ', w: 44 }]} />
      {innings.bowlingCard.map((b) => {
        const active = b.registrationId === live?.currentBowlerId;
        return (
          <Row key={b.registrationId} active={active}>
            <Text numberOfLines={1} style={{ flex: 1, paddingRight: 6, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: active ? '#fff' : '#d4d4d4' }}>
              {b.name}
              {active ? <Text style={{ color: '#F97316' }}> ★</Text> : null}
            </Text>
            <Text style={{ ...NUM, width: 34, color: '#a3a3a3' }}>{b.overs}</Text>
            <Text style={{ ...NUM, width: 26, color: '#7d7d7d' }}>{b.maidens}</Text>
            <Text style={{ ...NUM, width: 30, color: '#a3a3a3' }}>{b.runs}</Text>
            <Text style={{ ...NUM_BOLD, width: 26, color: '#fff' }}>{b.wickets}</Text>
            <Text style={{ ...NUM, width: 44, color: '#a3a3a3' }}>{b.economy.toFixed(2)}</Text>
          </Row>
        );
      })}
    </Block>
  );
}

/** The wickets and stands tables live in LivePanels/CricketCharts so the live
 *  panel can use them too; both return null when empty, hence this stand-in. */
function Nothing({ text }: { text: string }) {
  return (
    <Block>
      <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 10, letterSpacing: 0.1 * 10, textTransform: 'uppercase', color: '#7d7d7d', textAlign: 'center', paddingVertical: 22 }}>
        {text}
      </Text>
    </Block>
  );
}

export function ScorecardTabs({
  innings1,
  innings2,
  currentInnings,
  live,
}: {
  innings1: InningsScorecard | null;
  innings2: InningsScorecard | null;
  currentInnings: 1 | 2;
  live: LiveState | null;
}) {
  const hasTwo = !!innings1 && !!innings2;
  const [inningsOverride, setInningsOverride] = useState<1 | 2 | null>(null);
  const inningsView = inningsOverride ?? currentInnings;
  const [sub, setSub] = useState<SubTab>('batting');
  const innings = inningsView === 1 ? innings1 : innings2;
  if (!innings) return null;

  const liveFor = inningsView === currentInnings ? live : null;

  return (
    <View style={{ gap: 10 }}>
      {hasTwo ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {([1, 2] as const).map((n) => (
            <Chip key={n} label={`Innings ${n}`} selected={inningsView === n} onPress={() => setInningsOverride(n)} />
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {SUBS.map((s) => (
          <Chip key={s.key} label={s.label} selected={sub === s.key} onPress={() => setSub(s.key)} />
        ))}
      </View>

      {sub === 'batting' ? <BattingTable innings={innings} live={liveFor} /> : null}
      {sub === 'bowling' ? <BowlingTable innings={innings} live={liveFor} /> : null}
      {sub === 'fow'
        ? innings.fallOfWickets.length > 0
          ? <FallOfWickets innings={innings} />
          : <Nothing text="No wickets have fallen" />
        : null}
      {sub === 'stands'
        ? (innings.partnerships ?? []).length > 0
          ? <PartnershipsList innings={innings} />
          : <Nothing text="No stands recorded yet" />
        : null}
    </View>
  );
}
