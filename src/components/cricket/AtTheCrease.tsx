import { View, Text } from 'react-native';
import { LiveState, InningsScorecard } from '@/api/cricketMatch';

const LBL = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: '#7d7d7d' };

function batterLine(innings: InningsScorecard | null, id?: string) {
  const b = innings?.battingCard.find((x) => x.registrationId === id);
  if (!b) return null;
  return { name: b.name, figure: `${b.runs} (${b.ballsFaced})` };
}

function bowlerLine(innings: InningsScorecard | null, id?: string) {
  const b = innings?.bowlingCard.find((x) => x.registrationId === id);
  if (!b) return null;
  return { name: b.name, figure: `${b.overs}-${b.maidens}-${b.runs}-${b.wickets}` };
}

function Row({ who, figure, striker, label }: { who: string; figure: string; striker?: boolean; label?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 10 }}>
      {striker ? <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#F97316' }} /> : null}
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: striker ? '#fff' : '#d4d4d4' }}>
        {who}
      </Text>
      {label ? <Text style={{ ...LBL, letterSpacing: 0.1 * 9 }}>{label}</Text> : null}
      <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: striker ? '#F97316' : '#fff' }}>{figure}</Text>
    </View>
  );
}

export function AtTheCrease({ live, innings }: { live: LiveState | null; innings: InningsScorecard | null }) {
  if (!live) return null;
  const striker = batterLine(innings, live.strikerId);
  const nonStriker = batterLine(innings, live.nonStrikerId);
  const bowler = bowlerLine(innings, live.currentBowlerId);
  const e = live.extras;
  if (!striker && !nonStriker && !bowler) return null;

  return (
    <View>
      <Text style={{ ...LBL, marginBottom: 8 }}>At the crease</Text>
      <View style={{ backgroundColor: '#151515', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 6, overflow: 'hidden' }}>
        {striker ? <Row who={striker.name} figure={striker.figure} striker /> : null}
        {nonStriker ? <Row who={nonStriker.name} figure={nonStriker.figure} /> : null}
        {bowler ? (
          <>
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.10)' }} />
            <Row who={bowler.name} figure={bowler.figure} label="Bowling" />
          </>
        ) : null}
        {e ? (
          <>
            <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Text style={{ fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 0.08 * 9, textTransform: 'uppercase', color: '#7d7d7d', paddingHorizontal: 13, paddingVertical: 9 }}>
              Extras · wd {e.wides} · nb {e.noBalls} · b {e.byes} · lb {e.legByes}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
